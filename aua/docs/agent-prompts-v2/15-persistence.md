```
Stai implementando da zero il package `packages/persistence` per AUA (Agentic Universal
Accessibility Runtime). Root del repo: C:\HACKATON\new\hackton (già unificato — non occuparti
di merge). Questo package NON esiste ancora in nessuna parte del repo. Lavora su un branch
dedicato `feat/persistence`.

Contesto: `aua/docs/adr/ADR-019-persistence-storage.md` stabilisce un approccio pattern-first,
vendor-agnostico. Store sessione/audit: store documentale o relazionale per metadati di
sessione + record AuditEvent (redatti secondo ADR-015/016). Checkpoint store LangGraph: un
checkpointer durevole per flussi multi-step. Skill Registry: JSON versionato source-controlled
in `packages/skill-sdk` — non un database runtime-mutabile. Storage browser-local: solo storage
dell'estensione, mai sincronizzato di default al server. Esplicitamente esclusi dalla
persistenza: audio grezzo, DOM grezzo, valori sensibili, trascrizioni non redatte.

Leggi prima (solo lettura):
- aua/docs/adr/ADR-019-persistence-storage.md
- packages/skill-sdk/src/types.ts (per il tipo `SkillDefinition` da riusare nel loader)

Il tuo compito — crea `packages/persistence/`:

1. `packages/persistence/src/types.ts`
   Esporta:
   - `SessionRecord: { sessionId: string; tabId: number; createdAt: string; updatedAt: string;
     pairingSessionId?: string; contractVersion: string }`
   - `AuditRecord: { id: string; sessionId: string; pageId: string; eventType: string;
     skillId?: string; elementId?: string; outcome?: string; timestamp: string; redacted:
     true }` — `redacted` è SEMPRE letteralmente `true`, imposto dal tipo
   - `CheckpointRecord: { checkpointId: string; sessionId: string; stepId: string; state:
     object; createdAt: string }`

2. `packages/persistence/src/session-repository.ts`
   Esporta interfaccia `SessionRepository` (`createSession`, `getSession`, `updateSession`,
   `deleteSession`, tutti async) e `class InMemorySessionRepository implements
   SessionRepository` (per test e fasi iniziali).

3. `packages/persistence/src/audit-repository.ts`
   Esporta interfaccia `AuditRepository` (`append`, `queryBySession(sessionId, limit?)`,
   `purgeOlderThan(cutoffIso)` che ritorna il conteggio eliminato) e `class
   InMemoryAuditRepository implements AuditRepository`. In `append`, se `record.redacted !==
   true` lancia `Error("persistence: AuditRecord.redacted must be true")`.

4. `packages/persistence/src/checkpoint-repository.ts`
   Esporta interfaccia `CheckpointRepository` (`save`, `load`, `listBySession`) e `class
   InMemoryCheckpointRepository implements CheckpointRepository`.

5. `packages/persistence/src/skill-registry-loader.ts`
   Esporta `loadSkillDefinitionsFromJson(jsonDir: string): SkillDefinition[]` — legge tutti i
   file `*.json` da `jsonDir` in modo sincrono con `fs` di Node, li parsa come
   `SkillDefinition` (importato da `@aua/skill-sdk`), ritorna l'array; lancia se un file non è
   JSON valido. Chiamato solo all'avvio (caricamento a deploy-time), non a runtime da un
   agente.

6. Test in `packages/persistence/src/__tests__/audit-repository.test.ts`: `append` con
   `redacted: false` lancia; `append` con `redacted: true` viene salvato; `queryBySession`
   ritorna i record corretti; `purgeOlderThan` rimuove i record corretti.

7. `packages/persistence/package.json`: name `@aua/persistence`, version `0.1.0`, dipendenza
   su `@aua/skill-sdk` (workspace:*).

Vincoli: usa solo implementazioni in-memory — nessun vero client di database. Resta dentro
`packages/persistence/`. Esegui `npm run build`/`test` limitati a questo workspace prima di
committare sul branch `feat/persistence` (nessun push).
```
