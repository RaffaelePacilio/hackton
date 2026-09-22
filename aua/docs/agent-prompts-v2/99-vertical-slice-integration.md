# WAVE 2 (ESEGUIRE DA SOLO, DOPO CHE TUTTA LA WAVE 1 È MERGIATA IN MAIN)

```
Stai realizzando la "First Vertical Slice Integration" per AUA (Agentic Universal
Accessibility Runtime), un'estensione browser che rende accessibili siti di terze parti senza
modificarne il codice. Root del repo: C:\HACKATON\new\hackton. Questo è WP-020 nel grafo delle
dipendenze (`aua/docs/diagrams/dependency-dag.md`, SYNC-4) — NON esiste alcun prompt
precedente per questo lavoro: il vecchio `aua/docs/agent-prompts.md` chiamava "AGENT-020"
qualcosa di diverso (Deployment Topology) per un disallineamento di numerazione tra il piano
originale e il grafo dei Work Package — questo prompt lo scrive da zero.

PRECONDIZIONE — non iniziare se non è vera: tutti questi package devono già esistere, buildare
e passare i test nella root (verificalo con `npm run build` e `npm run test` a livello di
root prima di procedere; se qualcosa manca o non compila, fermati e riporta cosa manca invece
di improvvisare un'implementazione parallela):
`@aua/contracts`, `@aua/shared`, `@aua/semantic-model`, `@aua/barrier-detection`,
`@aua/agent-runtime`, `@aua/skill-sdk`, `@aua/web-components`, `@aua/form-agent`,
`@aua/routing-layer`, `@aua/verification-engine`, `@aua/voice`, `@aua/state`,
`@aua/security`, `@aua/privacy`, `@aua/observability`, `@aua/mobile-pairing`.
Lavora su un branch dedicato `feat/vertical-slice-integration`.

Contesto — leggi per intero (solo lettura, non modificare i contratti/ADR):
- aua/docs/architecture/04-runtime-flows.md — in particolare lo "Scenario B", che descrive il
  ciclo di vita completo di una barriera: DOM/MutationObserver → SemanticPageModel Builder →
  Barrier Detection Engine (+ Interaction Contract Store) → Adaptation Planner (+ Intent
  Engine) → Skill Executor → Web Component Injector + Verification Engine → esito. Questo è il
  criterio di accettazione della tua integrazione.
- aua/docs/architecture/99-final-summary.md
- packages/contracts/src/*.ts (tipi congelati che collegano tutti i package tra loro)
- apps/browser-extension/src/**/*.ts (stato attuale — content-script già costruisce il
  SemanticPageModel e riceve `AUA_ROUTE_CHANGE`, ma non chiama nulla oltre a quello)

Il tuo compito — dentro `apps/browser-extension/` (questo è l'UNICO package che tocchi in
questo prompt; tutti gli altri sono dipendenze da consumare via import, non da modificare):

1. In `apps/browser-extension/src/content/content-script.ts`:
   - dopo che `SemanticModelBuilder` (da `@aua/semantic-model`) produce un
     `SemanticPageModel`, passalo a `@aua/barrier-detection` insieme all'`InteractionContract`
     corrente (letto da storage, vedi `@aua/contracts`/`shared/interaction-contract.ts`
     esistente) per ottenere la lista di `Barrier`
   - per ogni `Barrier` rilevato, invoca `BrowserOrchestrator` (da `@aua/agent-runtime`,
     costruito con una `ProviderChain` di provider — usa `NullProvider`/`StubProvider` come
     provider di default per questa slice, non serve integrare un vero LLM ora) per ottenere
     un `AgentDecision`
   - se la decisione è `execute-plan`, per ciascuno step invoca `SkillExecutor` (da
     `@aua/skill-sdk`) per validare ed "eseguire" la skill
   - se la skill ha come effetto il montaggio di un adapter (es. `inject_field_proxy`,
     `inject_stepper`), chiama `mountAdapter` (da `@aua/web-components`) per montarlo davvero
     accanto all'elemento target
   - dopo l'esecuzione, chiama `VerificationEngine.verifyWithRetry` (da
     `@aua/verification-engine`) con una `readFn` che legge davvero il DOM della pagina target
   - se la decisione è `confirm-with-user`, mostra i candidati tramite un adapter
     `a11y-command-palette`/`a11y-action-panel` (da `@aua/web-components`) invece di eseguire
     alla cieca
   - se la decisione è `degraded-mode`, non eseguire nulla e annuncia lo stato degradato via
     `a11y-live-region` (mai un fallimento silenzioso, coerente con l'executive summary)
   - traccia l'intero ciclo con `@aua/observability` (`AuaTracer.startSpan`/`endSpan` per
     `aua.barrier.detect`, `aua.adaptation.plan`, `aua.skill.execute`, `aua.verification`)
   - registra ogni esito significativo in `@aua/state` (`SessionStore` + `AuditLog`) — rispetta
     l'invariante che gli eventi su elementi sensibili devono avere `redacted: true`
   - passa ogni input diretto a un provider di reasoning attraverso `@aua/security`
     (`assertRedactedSlice`, `sanitizeForProvider`) e `@aua/privacy`
     (`validateTelemetryPayload` per ciò che finisce in telemetria) prima che lasci il content
     script

2. Collega `@aua/routing-layer` (`RoutingAccessibilityService`) al flusso `AUA_ROUTE_CHANGE`
   già emesso da `page-bridge.ts`/ascoltato da `content-script.ts`, così che ogni cambio di
   route produca davvero un annuncio via `a11y-live-region` e un ripristino del focus — oggi
   questo segnale esiste ma non ha alcun consumer.

3. Nel `background/service-worker.ts`, sostituisci l'uso locale/duplicato di
   `BackendTransport`/`createNullTransport` con l'import reale da `@aua/shared`.

4. Per il testo/form: quando una skill richiede una scrittura di campo (`fill_field`), usa
   `@aua/form-agent` (`FormAgent.write`) invece di scrivere `el.value` direttamente nel
   content-script.

5. Scrivi un test di integrazione end-to-end (jsdom, usando le fixture di `@aua/testing` se
   già disponibili, altrimenti un DOM minimale costruito nel test) che riproduce lo Scenario B:
   una fixture con uno slider drag-only → il flusso completo rileva la barriera, produce un
   piano, esegue la skill `inject_stepper`, monta l'adapter `a11y-stepper`, verifica il
   risultato, e produce almeno uno span di observability con status `"ok"`. Metti questo test
   in `apps/browser-extension/src/__tests__/vertical-slice.test.ts`.

6. Aggiorna `aua/docs/architecture/04-runtime-flows.md` SOLO se noti che l'implementazione
   reale devia in modo sostanziale dallo Scenario B descritto (es. un ordine diverso delle
   chiamate) — annota la deviazione con una breve nota, non riscrivere il documento.

Vincoli: non modificare le API pubbliche dei package consumati (contracts, semantic-model,
barrier-detection, agent-runtime, skill-sdk, web-components, verification-engine, voice, state,
security, privacy, observability, mobile-pairing, form-agent, routing-layer, shared) — se una
ne manca o ha una forma incompatibile con quanto serve qui, riporta il problema nel messaggio
finale invece di modificarla direttamente (potrebbe essere usata da altri consumer). Resta
dentro `apps/browser-extension/`. Esegui `npm run build`/`test` a livello di root (non solo di
questo workspace, perché questo è il punto di integrazione di tutti gli altri) prima di
committare sul branch `feat/vertical-slice-integration` (nessun push).
```
