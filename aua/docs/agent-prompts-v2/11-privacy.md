```
Stai implementando da zero il package `packages/privacy` per AUA (Agentic Universal
Accessibility Runtime). Root del repo: C:\HACKATON\new\hackton (già unificato — non occuparti
di merge). Questo package NON esiste ancora in nessuna parte del repo. Lavora su un branch
dedicato `feat/privacy`.

Contesto: `aua/docs/adr/ADR-015-privacy-data-handling.md` stabilisce elaborazione local-first —
costruzione del SemanticPageModel, rilevazione barriere ed esecuzione skill avvengono
interamente nel browser; solo i casi ambigui invocano una chiamata di reasoning remota con una
slice redatta. I valori dei campi sensibili non lasciano MAI il browser come valori — solo
come booleani di presenza/stato. La redazione è strutturale, non per convenzione. Audio
grezzo, DOM grezzo, valori sensibili, trascrizioni non redatte oltre la sessione attiva: mai
persistiti.

Leggi prima (solo lettura):
- aua/docs/adr/ADR-015-privacy-data-handling.md
- packages/observability/src/ingestion-validator.ts (validatore analogo già esistente per gli
  span di observability — questo package copre un ambito complementare più ampio per payload
  di telemetria generici, non duplicare la logica, riusa lo stile)

Il tuo compito — crea `packages/privacy/`:

1. `packages/privacy/src/data-classes.ts`
   Esporta `enum DataClass`:
   - `SENSITIVE_VALUE = "sensitive_value"` (password, campi di pagamento)
   - `FORM_INPUT = "form_input"` (input utente non sensibile)
   - `PAGE_STRUCTURE = "page_structure"` (SemanticPageModel redatto)
   - `AUDIO_TRANSCRIPT = "audio_transcript"` (scoped alla sessione, non persistito oltre)
   - `AUDIT_METADATA = "audit_metadata"` (timestamp, skill ID, esiti)
   - `TELEMETRY = "telemetry"` (latenza, conteggi — nessun contenuto)
   Esporta `DATA_CLASS_RETENTION: Record<DataClass, "never" | "session" | "configurable">`:
   `SENSITIVE_VALUE: "never"`, `FORM_INPUT: "session"`, `PAGE_STRUCTURE: "session"`,
   `AUDIO_TRANSCRIPT: "session"`, `AUDIT_METADATA: "configurable"`,
   `TELEMETRY: "configurable"`.

2. `packages/privacy/src/telemetry-redaction-validator.ts`
   Esporta interfaccia `TelemetryPayload { sessionId: string; eventType: string; elementId?:
   string; sensitive?: boolean; [key: string]: unknown }`.
   Esporta `validateTelemetryPayload(payload): { valid: boolean; violations: string[] }`:
   - se `sensitive === true`: nessun campo `"value"`, `"rawText"`, `"utterance"`,
     `"transcript"` deve essere presente → violazione se trovato
   - nessun valore stringa più lungo di 200 caratteri (euristica per leak di contenuto) →
     violazione se trovato

3. `packages/privacy/src/audio-session-cleaner.ts`
   Esporta `class AudioSessionCleaner`:
   - `private sessionBuffers: Map<string, { rawUtterance?: string; startedAt: number }>`
   - `startSession(sessionId): void`
   - `recordUtterance(sessionId, rawUtterance): void`
   - `endSession(sessionId): { finalUtterance: string | null }` — ritorna l'ultima utterance,
     poi elimina il buffer della sessione (l'audio grezzo non viene persistito)
   - `clearAll(): void`

4. Test in `packages/privacy/src/__tests__/telemetry-redaction-validator.test.ts` (payload
   sensibile con campo value → violazione; payload pulito → valido; campo stringa lungo →
   violazione) e `packages/privacy/src/__tests__/audio-session-cleaner.test.ts` (`endSession`
   ritorna l'utterance poi pulisce; `clearAll` rimuove tutte le sessioni; accesso a sessione
   terminata ritorna null).

5. `packages/privacy/package.json`: name `@aua/privacy`, version `0.1.0`.

Vincoli: nessuna chiamata di rete. Non persistere dati sensibili su disco/storage. Resta
dentro `packages/privacy/`. Esegui `npm run build`/`test` limitati a questo workspace prima di
committare sul branch `feat/privacy` (nessun push).
```
