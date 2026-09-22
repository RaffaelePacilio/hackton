```
Stai completando il package `packages/agent-runtime` per AUA (Agentic Universal Accessibility
Runtime). Root del repo: C:\HACKATON\new\hackton (già unificato — non occuparti di merge).
Lavora su un branch dedicato `feat/agent-runtime-provider-chain`.

Contesto: `aua/docs/adr/ADR-005-agent-orchestration.md` stabilisce un orchestratore custom
sottile nel browser (nessun framework pesante), con una singola chiamata LLM strettamente
delimitata per barriera non risolta, e con una logica di disambiguazione: se due candidati di
piano hanno confidenza troppo simile, l'esito deve essere "chiedi conferma all'utente" invece
di eseguire alla cieca. `aua/docs/adr/ADR-006-ai-provider-abstraction.md` stabilisce
un'interfaccia `ReasoningProvider` con una catena di fallback (primario → secondario →
modalità degradata rule-only).

STATO ATTUALE: il package ha già `orchestrator.ts` (classe `BrowserOrchestrator`) e provider
null/stub in `reasoning-provider.ts` o file analoghi, con qualche test — ma:
- non esiste alcuna `ProviderChain` (fallback primario→secondario→null) — esistono solo
  provider isolati
- non è confermato che `BrowserOrchestrator.resolveBarrier` implementi davvero la logica a
  DUE candidati con soglia di disambiguazione richiesta da ADR-005 (verifica leggendo il file
  per intero, non fermarti all'inizio)

Leggi prima (solo lettura):
- aua/docs/adr/ADR-005-agent-orchestration.md
- aua/docs/adr/ADR-006-ai-provider-abstraction.md
- packages/agent-runtime/src/*.ts per intero (orchestrator, tipi, provider esistenti)

Il tuo compito:

1. Verifica `BrowserOrchestrator.resolveBarrier(barrier, slice)`. Deve:
   a. Chiamare `provider.planAdaptation({ barrier, context: slice })`
   b. Se il provider lancia/va in timeout → `{ type: "degraded-mode", reason: "provider-unavailable" }`
   c. Se `plan.confidence < minConfidenceFloor` (default 0.6, configurabile) →
      `{ type: "degraded-mode", reason: "low-confidence" }`
   d. Chiamare `planAdaptation` una SECONDA volta per ottenere un secondo candidato (verifica
      disambiguazione)
   e. Se `|plan1.confidence - plan2.confidence| < disambiguationThreshold` (default 0.15) →
      `{ type: "confirm-with-user", topCandidates: [plan1, plan2], reason: "ambiguous-targets" }`
   f. Altrimenti → `{ type: "execute-plan", plan: topCandidate }`
   Se questa logica manca o è parziale, completala. Se esiste già, aggiungi solo i test che
   mancano per i branch non coperti.

2. `packages/agent-runtime/src/provider-chain.ts`
   Esporta `class ProviderChain implements ReasoningProvider`:
   - Costruttore accetta `providers: ReasoningProvider[]` (ordine primario→secondario)
   - `name: "chain"`
   - `planAdaptation`/`resolveIntent`/`summarizePage`: prova ogni provider in ordine, cattura
     errori e passa al successivo; se tutti falliscono, ritorna il risultato del provider null
     (confidenza 0 / intent "query" / stringa vuota secondo il tipo di chiamata)
   - `healthCheck()`: `true` se almeno un provider è sano

3. Test in `packages/agent-runtime/src/__tests__/provider-chain.test.ts`:
   - primo provider fallisce → usa il secondo con successo
   - tutti falliscono → risultato del provider null, nessuna eccezione propagata
   - `healthCheck` corretto

4. Se non esistono già, aggiungi/completa test in
   `packages/agent-runtime/src/__tests__/browser-orchestrator.test.ts` per i 4 casi della
   logica descritta al punto 1 (errore provider, confidenza sotto soglia, due candidati vicini,
   vincitore chiaro), con un provider mock.

Vincoli: non implementare LangGraph qui (è compito del backend, fuori scope). Non chiamare
nessuna vera API LLM. Resta dentro `packages/agent-runtime/`. Esegui `npm run build`/`test`
limitati a questo workspace prima di committare sul branch
`feat/agent-runtime-provider-chain` (nessun push).
```
