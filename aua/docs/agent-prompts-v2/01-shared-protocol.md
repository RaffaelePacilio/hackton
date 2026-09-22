```
Stai implementando il package `packages/shared` per AUA (Agentic Universal Accessibility
Runtime), un'estensione browser che rende accessibili siti di terze parti senza modificarne il
codice. Root del repo: C:\HACKATON\new\hackton (già unificato con il lavoro di un compagno di
squadra — non devi occuparti di merge, solo del tuo package). Lavora su un branch dedicato
`feat/shared-protocol`.

Contesto: `aua/docs/adr/ADR-001-runtime-topology.md` stabilisce che l'estensione browser
possiede tutto il lavoro sul DOM (SemanticPageModel, esecuzione skill, verifica); il backend
possiede tutto il reasoning LLM. Comunicano tramite un protocollo di messaggi tipizzato —
l'estensione non manda mai DOM grezzo al backend, solo slice redatte del SemanticPageModel.
Questo package NON esiste ancora in nessuna parte del repo: in
`apps/browser-extension/src/background/service-worker.ts` trovi un TODO che duplica a mano un
`BackendTransport`/`createNullTransport` in attesa di questo package — NON modificare quel
file, un altro agente si occuperà del collegamento in una fase successiva.

Leggi prima (solo lettura, contratti già congelati, non modificarli):
- aua/docs/adr/ADR-001-runtime-topology.md
- packages/contracts/src/semantic-page-model.ts (per capire la forma di SemanticPageModel/slice
  redatte già congelata — riusa quei tipi, non ridefinirli)

Il tuo compito — crea `packages/shared/`:

1. `packages/shared/package.json`: name `@aua/shared`, version `0.1.0`, con dipendenza su
   `@aua/contracts` (workspace:*) per riusare i tipi di semantic-page-model/interaction-contract
   invece di duplicarli.

2. `packages/shared/src/protocol/messages.ts`
   Definisci ed esporta:
   - `MessageEnvelope<T>`: `{ version: string; sessionId: string; pageId: string; timestamp: number; payload: T }`
   - `ExtensionToBackendMessage`: union di `AdaptationRequest | HealthCheckRequest | AuditEventBatch`
   - `BackendToExtensionMessage`: union di `AdaptationResponse | HealthCheckResponse | DegradedModeSignal`
   - `AdaptationRequest`: `{ type: "adaptation-request"; barrier: Barrier; redactedSlice: RedactedSemanticSlice }`
     (definisci `Barrier` minimale qui: `{ id: string; elementId: string; barrierType: string; severity: "low"|"medium"|"high"|"unknown"; description: string }`;
     per `RedactedSemanticSlice` riusa/deriva dal tipo `SemanticPageModel` già congelato in
     `@aua/contracts`)
   - `HealthCheckRequest`: `{ type: "health-check" }`
   - `HealthCheckResponse`: `{ type: "health-check-response"; healthy: boolean }`
   - `AuditEventBatch`: `{ type: "audit-batch"; events: Array<{ type: string; sessionId: string; timestamp: number; redacted: boolean }> }`
   - `AdaptationResponse`: `{ type: "adaptation-response"; plan: AdaptationPlan | null; degraded: boolean; failureReason?: string }`
     (definisci `AdaptationPlan` minimale: `{ barrierId: string; steps: Array<{ skillId: string; inputs: Record<string, unknown> }>; confidence: number }`)
   - `DegradedModeSignal`: `{ type: "degraded-mode"; reason: "provider-unavailable" | "backend-unreachable" | "rate-limited" }`
   Tutti i tipi devono essere JSON-serializzabili (niente funzioni, niente istanze di classi).

3. `packages/shared/src/protocol/transport.ts`
   Esporta interfaccia `BackendTransport`:
   ```ts
   interface BackendTransport {
     send(msg: ExtensionToBackendMessage): Promise<BackendToExtensionMessage>;
     isAvailable(): Promise<boolean>;
   }
   ```
   Esporta `createNullTransport(): BackendTransport` che ritorna sempre un `DegradedModeSignal`
   con reason `"backend-unreachable"` da `send`, e `false` da `isAvailable` (usato nei test e in
   modalità offline).

4. `packages/shared/src/protocol/index.ts` che ri-esporta tutto da `messages.ts` e
   `transport.ts`.

5. `packages/shared/src/index.ts` che ri-esporta da `protocol/index.ts`.

6. Test unitari in `packages/shared/src/__tests__/messages.test.ts` (usa lo stesso test runner
   già in uso negli altri package — controlla `packages/contracts/vitest.config.ts` come
   riferimento, quasi certamente vitest):
   - `createNullTransport().isAvailable()` risolve `false`
   - `createNullTransport().send(...)` risolve un `DegradedModeSignal` con
     `reason: "backend-unreachable"`
   - Un `MessageEnvelope<AdaptationRequest>` costruito manualmente supera un controllo a runtime
     minimale (es. tutte le chiavi richieste presenti) — non serve un vero validator JSON
     Schema, basta un test di forma.

7. Aggiungi `packages/shared/tsconfig.json` che estende `tsconfig.base.json` della root, sullo
   stesso modello degli altri package.

Vincoli: non implementare il trasporto HTTP/WebSocket reale — quello appartiene al package
`packages/session-gateway` (altro agente). Non toccare codice DOM. Resta dentro
`packages/shared/`. Alla fine esegui `npm run build` e `npm run test` limitati a questo
workspace e assicurati che passino, poi fai commit sul branch `feat/shared-protocol` (non fare
push).
```
