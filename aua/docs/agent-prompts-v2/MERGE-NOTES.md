# Note di merge (Wave 0)

Merge completato: root `main` ha ora unito `origin/main` (il lavoro del compagno di squadra,
in precedenza clonato a parte in `hackton/hackton/`, ora rimossa). `npm run build` è verde su
tutti i 12 workspace. `npm run test` è verde ovunque TRANNE `packages/web-components`.

## Problema noto aperto: `packages/web-components` — 19 test falliti su 55

Non è stato introdotto dal merge: `a11y-field-proxy.ts`, `a11y-live-region.ts` e i relativi
file di test (`test/unit/a11y-field-proxy.test.ts`, `test/unit/a11y-live-region.test.ts`) sono
arrivati SENZA conflitto da `origin/main` (il compagno di squadra) — cioè erano già in questo
stato nel suo repo. I soli 3 file di questo package che hanno avuto un conflitto reale da
risolvere sono stati `src/base/AuaElement.ts`, `src/base/lifecycle-emitter.ts`,
`src/index.ts` (risolti scegliendo sempre la versione più corretta/completa di `origin/main`).

Sintomo: `el.accessibleRole` e `el.accessibleName` risultano `undefined` in alcuni test pur
essendo getter definiti correttamente sulla classe (`A11yFieldProxy`/`A11yLiveRegion` estendono
`AuaElement`, i getter sono presenti nel codice sorgente). Alcuni test sullo stesso file/stessa
classe passano, altri no — non ho investigato a fondo la causa esatta (sospetto legato a come
Vitest/jsdom fanno l'upgrade dell'elemento custom creato via `document.createElement(tag)` in
alcuni ordini di esecuzione dei test, ma non l'ho confermato).

**Assegnato a**: `aua/docs/agent-prompts-v2/06-web-components-adapters.md` — quell'agente
lavora già dentro `packages/web-components/` per aggiungere i 9 adapter mancanti; deve anche
investigare e risolvere questi 19 test falliti su `a11y-field-proxy`/`a11y-live-region` PRIMA
di aggiungere nuovi adapter (altrimenti rischia di replicare lo stesso bug 9 volte).

## Altre osservazioni dal merge

- `packages/skill-sdk/src/index.ts` esportava tipi (`ValidationResult`, `PerformSkill`,
  `VerifySkill`) che non esistevano in `executor.ts` — probabile residuo di una versione
  precedente di `executor.ts` mai sincronizzata. Corretto durante la Wave 0: ora esporta
  `SkillHandler`, `Verifier`, `CONFIRMATION_POLICY` (i nomi reali).
- Il registro skill (`packages/skill-sdk/registry/*.json`) è completo: 22/22 skill validate
  con successo da `validate-registry.mjs`, incluso `inject_stepper.json` (che un'analisi
  precedente aveva erroneamente segnalato come mancante — era già presente).
- Il compagno di squadra aveva committato `node_modules/` nel suo repo (~11.500 file). Rimosso
  dal tracking di git nella root (resta su disco, ignorato da `.gitignore`).
- Root `package.json` non aveva script (`build`/`test`/`lint`/`typecheck`) — aggiunti, fanno
  fan-out su tutti i workspace via `--workspaces --if-present`.
- `tsconfig.base.json` di root e quello del compagno erano già identici (nessun conflitto) —
  nessuna azione necessaria, a differenza di quanto ipotizzato in una nota di analisi precedente
  (che confrontava contro le specifiche superate di `agent-prompts.md`, non contro il repo del
  compagno).
