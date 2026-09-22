```
Stai implementando da zero il package `packages/state` per AUA (Agentic Universal Accessibility
Runtime). Root del repo: C:\HACKATON\new\hackton (già unificato — non occuparti di merge).
Questo package NON esiste ancora in nessuna parte del repo. Lavora su un branch dedicato
`feat/state-management`.

Contesto: `aua/docs/adr/ADR-013-state-management.md` stabilisce che SemanticPageModel e
InteractionContract vivono in memoria + storage locale dell'estensione. Nessun singleton
mutabile globale — lo stato è per-tab, scoped a `session_id + page_id`. La sincronizzazione
cross-boundary è unidirezionale e a eventi: il browser emette AuditEvent e riepiloghi di
sessione verso il backend; il backend non spinge MAI mutazioni di stato silenziose dentro il
SemanticPageModel del browser. Un'interruzione del backend non deve corrompere lo stato locale.

Leggi prima (solo lettura):
- aua/docs/adr/ADR-013-state-management.md
- packages/contracts/src/semantic-page-model.ts e interaction-contract.ts (tipi già congelati
  da riusare, non ridefinire)

Il tuo compito — crea `packages/state/`:

1. `packages/state/src/types.ts`
   Esporta:
   - `SessionKey: { sessionId: string; pageId: string; tabId: number }`
   - `TabSession: { key: SessionKey; semanticModel: SemanticPageModel | null; contract:
     InteractionContract; createdAt: number; updatedAt: number }`
   - `AuditEvent: { type: string; sessionId: string; pageId: string; elementId?: string;
     skillId?: string; timestamp: number; redacted: boolean; outcome?: string }`
   (importa `SemanticPageModel` da `@aua/semantic-model` o `@aua/contracts` — verifica quale
   dei due package esporta il tipo canonico dopo il merge, e usa quello; `InteractionContract`
   da `@aua/contracts`)

2. `packages/state/src/session-store.ts`
   Esporta `class SessionStore`:
   - `private sessions: Map<string, TabSession>` (chiave `${sessionId}:${pageId}:${tabId}`)
   - `createSession(key, contract): TabSession`
   - `getSession(key): TabSession | undefined`
   - `updateSemanticModel(key, model): void` — solo se la sessione esiste; aggiorna `updatedAt`
   - `removeSession(key): void`
   - Nessuno stato cross-sessione: ogni sessione per-tab è completamente isolata

3. `packages/state/src/event-bus.ts`
   Esporta `class EventBus`:
   - `subscribe<T>(eventType: string, handler: (event: T) => void): () => void` (ritorna
     funzione di unsubscribe)
   - `emit<T>(eventType: string, event: T): void`
   - Nessuna persistenza degli eventi — solo in memoria

4. `packages/state/src/audit-log.ts`
   Esporta `class AuditLog`:
   - `private buffer: AuditEvent[]`
   - `record(event): void` — DEVE controllare: se `event.elementId` si riferisce a un elemento
     sensibile, impone `event.redacted === true`; se non lo è, lancia
     `Error("audit-log: redacted must be true for sensitive elements")`
   - `flush(): AuditEvent[]` — ritorna e svuota il buffer (per invio batch al backend)
   - Nota: questo è un buffer locale; il flush verso il backend è responsabilità del layer di
     trasporto (fuori scope qui)

5. Test in `packages/state/src/__tests__/session-store.test.ts` (create/get/update/remove,
   isolamento tra sessioni, `updateSemanticModel` su sessione mancante è un no-op) e
   `packages/state/src/__tests__/audit-log.test.ts` (evento sensibile con `redacted: false` →
   lancia; evento sensibile con `redacted: true` → registrato; evento non sensibile →
   registrato).

6. `packages/state/package.json`: name `@aua/state`, version `0.1.0`, dipendenza su
   `@aua/contracts` (workspace:*) e sul package che esporta `SemanticPageModel`.

Vincoli: resta dentro `packages/state/`. Non aggiungere chiamate HTTP qui. Esegui `npm run
build`/`test` limitati a questo workspace prima di committare sul branch
`feat/state-management` (nessun push).
```
