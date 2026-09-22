```
Stai completando il package `packages/web-components` per AUA (Agentic Universal Accessibility
Runtime). Root del repo: C:\HACKATON\new\hackton (già unificato — non occuparti di merge).
Lavora su un branch dedicato `feat/web-components-adapters`.

Contesto: `aua/docs/adr/ADR-009-web-component-adaptation.md` stabilisce che i Web Component
iniettati vengono montati in Shadow DOM chiusi AFFIANCO (non in sostituzione) all'elemento
originale, si sincronizzano bidirezionalmente con esso, usano Shadow DOM chiuso per
isolamento di stile, custom property CSS come API di theming, e ADR-009 elenca 11 adapter
previsti in totale.

STATO ATTUALE: il package ha già un framework base (`src/base/{AuaElement.ts,
focus-manager.ts, lifecycle-emitter.ts}`) e 2 adapter reali (`a11y-field-proxy`,
`a11y-live-region`, più `mount.ts`). Mancano gli altri 9 adapter previsti da ADR-009:
`a11y-stepper`, `a11y-choice-list`, `a11y-command-palette`, `a11y-route-navigation`,
`a11y-focus-guide`, `a11y-action-panel`, `a11y-reader`, `a11y-skip-navigation`,
`a11y-voice-input`.

Leggi prima (solo lettura):
- aua/docs/adr/ADR-009-web-component-adaptation.md (per la mappa completa skill→adapter e i
  requisiti di theming/lifecycle/shadow DOM)
- packages/web-components/src/base/AuaElement.ts, focus-manager.ts, lifecycle-emitter.ts
  (framework base già esistente — ESTENDI questi per i nuovi adapter, non duplicarne la logica)
- packages/web-components/src/adapters/a11y-field-proxy.ts e a11y-live-region.ts (pattern di
  riferimento già stabilito da seguire per coerenza)
- packages/skill-sdk/registry/*.json per capire quali skill richiedono quale adapter (es.
  `inject_stepper` → `a11y-stepper`, `inject_choice_list` → `a11y-choice-list`,
  `inject_command_palette` → `a11y-command-palette`, `inject_route_navigation` →
  `a11y-route-navigation`)

Il tuo compito — per ciascuno dei 9 adapter mancanti, crea
`packages/web-components/src/adapters/<nome>.ts` che estende la stessa base class
(`AuaElement` o equivalente) usata da `a11y-field-proxy`/`a11y-live-region`, con:
- Shadow DOM chiuso, theming via CSS custom properties (segui la stessa convenzione
  `--a11y-bg`, `--a11y-fg`, `--a11y-border`, `--a11y-focus-ring` già usata)
- `connectedCallback`/`disconnectedCallback` puliti (nessuna perdita di listener)
- Un evento custom dispatchato sull'host element per ogni interazione rilevante (segui il
  pattern `a11y-value-change` già usato da `a11y-field-proxy`)
- Attributi osservati minimi e sensati per il tipo di componente, ad es.:
  - `a11y-stepper`: valore corrente, min/max/step, incrementa/decrementa via tastiera, dispatcha
    `a11y-value-change`
  - `a11y-choice-list`: lista di opzioni (`role="listbox"`), navigazione da tastiera
    freccia-su/giù, selezione con Enter/Spazio, dispatcha `a11y-selection-change`
  - `a11y-command-palette`: overlay con campo di ricerca testuale + lista filtrata di comandi,
    apertura/chiusura da tastiera, dispatcha `a11y-command-invoke`
  - `a11y-route-navigation`: lista di link/route con annuncio del cambio via
    `a11y-live-region` interno o riferimento a uno esterno
  - `a11y-focus-guide`: elemento invisibile che intercetta il focus e lo reindirizza (usato per
    trap di focus o per bypassare trappole di focus rotte nella pagina target)
  - `a11y-action-panel`: pannello con lista di azioni/bottoni accessibili in sostituzione di
    controlli con target troppo piccoli o gesture complesse
  - `a11y-reader`: regione che espone testo leggibile via TTS/lettore, con controlli
    play/pause/stop
  - `a11y-skip-navigation`: link "salta al contenuto principale" iniettato in testa alla pagina
  - `a11y-voice-input`: pulsante push-to-talk che dispatcha eventi custom `a11y-voice-start`/
    `a11y-voice-stop` (senza integrare qui la vera pipeline vocale — quella è
    `packages/voice`, questo componente è solo l'affordance UI)

Per ciascun adapter, aggiungi un test in `packages/web-components/test/unit/<nome>.test.ts`
(ambiente jsdom, segui lo stile dei test esistenti per `a11y-live-region`), verificando almeno:
rendering iniziale, un'interazione chiave, e il/gli evento/i custom dispatchato/i.

Aggiorna `packages/web-components/src/index.ts` per esportare/registrare (side-effect import)
tutti i nuovi adapter, e `packages/web-components/src/types.ts` se serve estendere
`AccessibilityAdapter`/`adaptationConfig.skillId` con i nuovi tipi di mountPoint necessari.

Vincoli: non sostituire mai l'elemento target della pagina, non usare light DOM per i controlli
iniettati. Resta dentro `packages/web-components/`. Esegui `npm run build`/`test` limitati a
questo workspace prima di committare sul branch `feat/web-components-adapters` (nessun push).
```
