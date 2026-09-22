```
Stai rifinendo il package `packages/verification-engine` per AUA (Agentic Universal
Accessibility Runtime). Root del repo: C:\HACKATON\new\hackton (già unificato dal repo del
compagno di squadra, dove questo package viveva prima — verifica che sia arrivato intero nella
root: `types.ts`, `verification-engine.ts`, `timeout-race.ts`, e una cartella `strategies/`).
Lavora su un branch dedicato `feat/verification-engine-hardening`.

Contesto: `aua/docs/adr/ADR-017-verification-engine.md` stabilisce che ogni `SkillInvocation`
con una `verificationStrategy` produce obbligatoriamente un `VerificationResult` prima di
riportare successo. Metodi: `dom-read`, `route-check`, `state-diff`, `accessibility-check`.
Timeout: default 2s. Al massimo un retry. Rollback per skill di classe DESTRUCTIVE in caso di
fallimento. Classificazione dei fallimenti: `timeout | mismatch | element-gone |
framework-blocked` — ognuna guida un messaggio utente distinto.

STATO ATTUALE: il package ha una buona copertura dei metodi (`verification-engine.ts` +
`strategies/` per dom-read/route-check/state-diff/accessibility-check + `timeout-race.ts`) ma
NON HA ALCUN TEST — nessuna cartella `__tests__`.

Leggi prima (solo lettura):
- aua/docs/adr/ADR-017-verification-engine.md
- packages/verification-engine/src/*.ts e src/strategies/*.ts per intero

Il tuo compito:

1. Verifica che `packages/verification-engine/src/types.ts` esporti: `VerificationMethod`,
   `VerificationConfig`, `VerificationStatus`, `FailureClass`, `VerificationResult` secondo lo
   schema di ADR-017 (`{ status; method; failureClass?; actualValue?; expectedValue?;
   durationMs }`). Completa se manca qualcosa.

2. Verifica `packages/verification-engine/src/verification-engine.ts` — `class
   VerificationEngine`:
   - `verify(config, elementId, readFn): Promise<VerificationResult>` — dispatcha alla
     strategia corretta in base a `config.method`, usa `config.timeoutMs ?? 2000`
   - `verifyWithRetry(config, elementId, readFn): Promise<VerificationResult>` — chiama
     `verify` una volta; se fallisce e il `failureClass` NON è `"element-gone"`, aspetta 200ms e
     riprova UNA sola volta; ritorna il risultato finale in ogni caso
   - `rollback(skillId, elementId, rollbackFn): Promise<{ rolled_back: boolean; error?:
     string }>` — chiama `rollbackFn`, cattura errori, ritorna `{ rolled_back: false, error:
     msg }` in caso di fallimento
   Se manca qualcosa di questa logica (in particolare "nessun retry se element-gone"),
   completala.

3. Crea `packages/verification-engine/src/__tests__/verification-engine.test.ts`:
   - percorso di successo `dom-read`
   - `element-gone` ritorna il `failureClass` corretto
   - il timeout scatta entro `timeoutMs` (usa un `readFn` che non risolve mai/risolve in
     ritardo)
   - un solo retry su `mismatch`
   - nessun retry su `element-gone`
   - `rollback` chiama la `rollbackFn` in caso di fallimento e gestisce correttamente
     un'eccezione lanciata da `rollbackFn`

4. Aggiungi test analoghi per ciascun file in `packages/verification-engine/src/strategies/`
   se non ne hanno già (uno per strategia: dom-read, route-check, state-diff,
   accessibility-check), coprendo almeno il caso di successo e il caso di fallimento tipico di
   quella strategia.

5. Se manca, crea `packages/verification-engine/src/index.ts` come punto di ingresso del
   package (ri-esporta `VerificationEngine`, tipi, strategie pubbliche).

Vincoli: non implementare l'interazione DOM reale — `readFn` e `rollbackFn` sono iniettati dal
chiamante (mock nei test). Resta dentro `packages/verification-engine/`. Esegui `npm run
build`/`test` limitati a questo workspace prima di committare sul branch
`feat/verification-engine-hardening` (nessun push).
```
