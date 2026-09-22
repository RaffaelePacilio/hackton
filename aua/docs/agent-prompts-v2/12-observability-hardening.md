```
Stai rifinendo il package `packages/observability` per AUA (Agentic Universal Accessibility
Runtime). Root del repo: C:\HACKATON\new\hackton. IMPORTANTE: questo package esisteva sia nella
root sia nel repo del compagno di squadra con implementazioni DIVERSE file-per-file; il passo
di merge (Wave 0) dovrebbe già aver scelto/riconciliato una versione unica per ciascun file
(`index.ts`, `ingestion-validator.ts`, `span-buffer.ts`, `span-schema.ts`, `tracer.ts`,
`tracer.test.ts`) — se trovi ancora duplicati o un file `MERGE-NOTES.md` con note aperte su
questo package, risolvile tu come parte di questo compito. Lavora su un branch dedicato
`feat/observability-hardening`.

Contesto: `aua/docs/adr/ADR-016-observability.md` stabilisce convenzioni semantiche
OpenTelemetry + uno schema di span di dominio custom. ID di correlazione di dominio:
`session_id`, `page_id`, `interaction_id`, `agent_run_id`, `skill_execution_id`,
`adaptation_id`, `voice_turn_id`. Un fallimento della pipeline di observability non deve MAI
bloccare l'azione visibile all'utente — l'emissione è fire-and-forget con buffering locale e
backpressure "drop-oldest". La redazione è imposta all'ingestione, non a valle.

Leggi prima (solo lettura):
- aua/docs/adr/ADR-016-observability.md
- packages/observability/src/*.ts per intero (stato attuale post-merge)

Il tuo compito — verifica e, dove manca, completa:

1. `packages/observability/src/span-schema.ts` deve esportare:
   - `DomainAttributes`: chiavi `aua.session_id` (obbligatoria), `aua.page_id` (obbligatoria),
     `aua.interaction_id`, `aua.agent_run_id`, `aua.skill_execution_id`, `aua.adaptation_id`,
     `aua.voice_turn_id` (tutte opzionali tranne le prime due)
   - `SpanName`: union che includa almeno `"aua.barrier.detect" | "aua.skill.execute" |
     "aua.adaptation.plan" | "aua.voice.turn" | "aua.model.call" | "aua.dom.analyze" |
     "aua.verification"`
   - `SpanStatus`: `"ok" | "error" | "degraded"`
   - `AuaSpan`: `{ name: SpanName; attributes: DomainAttributes & Record<string, string |
     number | boolean>; startMs: number; endMs?: number; status: SpanStatus; error?: string }`
   Se la versione attuale non copre tutti questi campi, completala.

2. `packages/observability/src/span-buffer.ts` — `class SpanBuffer`: buffer con
   `maxSize` (default 500), `record(span)` che scarta il più vecchio (`shift()`) se il buffer è
   pieno prima di inserire il nuovo, `flush()` che ritorna e svuota, `size()`. Se il
   comportamento "drop-oldest" non è già implementato correttamente, correggilo e aggiungi un
   test dedicato che riempie il buffer oltre `maxSize` e verifica che il primo elemento inserito
   sia stato scartato.

3. `packages/observability/src/ingestion-validator.ts` — `validateSpanBeforeIngestion(span,
   sensitiveElementIds: Set<string>): { valid: boolean; reason?: string }`:
   - se `span.attributes["aua.element_id"]` è in `sensitiveElementIds` e
     `span.attributes["aua.redacted"] !== true` → invalido, reason
     `"sensitive-element-not-redacted"`
   - se lo span contiene un attributo con chiave che termina in `_value` o `_content` →
     invalido, reason `"potential-content-leak"`
   - altrimenti valido

4. `packages/observability/src/tracer.ts` — `class AuaTracer`:
   - `startSpan(name, attributes): AuaSpan` (registra `startMs`)
   - `endSpan(span, status, error?): void` — imposta `endMs`/`status`/`error`; chiama
     `validateSpanBeforeIngestion`; se invalido NON bufferizza e incrementa un contatore
     `droppedSpans`; altrimenti registra nel buffer; NON deve MAI lanciare — tutto avvolto in
     try/catch
   - `getDroppedCount(): number`
   Se manca uno di questi comportamenti (in particolare "non deve mai lanciare anche con input
   malformato"), completalo.

5. Assicurati che `packages/observability/src/index.ts` esporti tutto il necessario
   (`AuaTracer`, `SpanBuffer`, tipi) — se manca, crealo/completalo.

6. Test in `packages/observability/src/__tests__/tracer.test.ts` (se già presente,
   completa i casi mancanti): span di elemento sensibile senza flag redacted → scartato; span
   pulito → bufferizzato; overflow del buffer scarta il più vecchio; il tracer non lancia mai
   nemmeno con input malformato passato deliberatamente nei test.

Vincoli: non aggiungere una vera dipendenza dall'SDK OTel (resta uno stub che rispetta lo
schema). Non bloccare mai nessun percorso di codice del chiamante. Resta dentro
`packages/observability/`. Esegui `npm run build`/`test` limitati a questo workspace prima di
committare sul branch `feat/observability-hardening` (nessun push).
```
