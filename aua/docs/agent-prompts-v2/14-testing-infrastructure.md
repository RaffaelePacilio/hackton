```
Stai implementando da zero il package `packages/testing` per AUA (Agentic Universal
Accessibility Runtime). Root del repo: C:\HACKATON\new\hackton (già unificato — non occuparti
di merge). Questo package NON esiste ancora in nessuna parte del repo. Lavora su un branch
dedicato `feat/testing-infrastructure`.

Contesto: `aua/docs/adr/ADR-018-testing-evaluation-strategy.md` stabilisce che i test E2E
girano contro fixture HTML "golden" possedute internamente — una fixture per pattern di
accessibilità, versionata in `packages/testing`. Mai testare contro siti reali di terze parti
(non deterministico). Piramide di test: unit → contract (validazione JSON Schema dei
messaggi) → component → agent/tool → skill deterministica → integration → estensione browser →
cross-browser → E2E (Playwright). Controlli automatici axe-core fanno parte della piramide.

Leggi prima (solo lettura):
- aua/docs/adr/ADR-018-testing-evaluation-strategy.md
- packages/contracts/schemas/*.json (schemi JSON già congelati per i messaggi/contratti — il
  tuo `contract-validator.ts` deve validare CONTRO QUESTI, non ridefinire schemi paralleli)
- packages/skill-sdk/schemas/skill-definition.schema.json

Il tuo compito — crea `packages/testing/`:

1. `packages/testing/src/fixtures/` — 9 file HTML autosufficienti (nessuna dipendenza
   esterna), ognuno con un commento iniziale
   `<!-- AUA TEST FIXTURE: <nome> — DO NOT modify without updating matching test expectations -->`:
   - `drag-only-slider.html`: uno slider implementato solo con eventi mouse drag (nessun
     supporto tastiera) — baseline inaccessibile per testare il rilevamento barriere.
   - `hover-only-menu.html`: menu di navigazione visibile solo con `:hover` CSS — non
     accessibile da tastiera.
   - `custom-select.html`: un dropdown fake basato su div/ul senza `role="listbox"`/`option`
     né gestione da tastiera.
   - `modal-focus-trap.html`: un dialog modale che NON intrappola il focus — il focus scappa
     dal dialog.
   - `inaccessible-spa-nav.html`: navigazione stile SPA (con `history.pushState` sui click)
     che non annuncia mai i cambi di route né ripristina il focus.
   - `react-controlled-input.html`: un input "controllato" simulato con JS vanilla che
     sovrascrive il setter di `value` per non rispondere alle assegnazioni dirette
     (`el.value = x` non ha effetto, serve la tecnica del setter nativo).
   - `dynamic-validation.html`: un form con errori di validazione iniettati dinamicamente nel
     DOM senza annunci via live region.
   - `shadow-dom-component.html`: un custom element con Shadow DOM per un input testuale,
     dove il vero input è dentro lo shadow root.
   - `accessible-baseline.html`: una pagina di riferimento completamente conforme WCAG 2.1 AA —
     usata come test negativo (non deve rilevare NESSUNA barriera).

2. `packages/testing/src/contract-validator.ts`
   Esporta `validateMessageAgainstSchema(message: unknown, schemaName: string): { valid:
   boolean; errors: string[] }` — usa Ajv per validare contro gli schemi JSON già congelati in
   `packages/contracts/schemas/` (caricali da lì, non duplicarli in questo package).
   Esporta `validateSemanticPageModel(model: unknown): { valid: boolean; errors: string[] }`.

3. `packages/testing/src/stub-factories.ts`
   Esporta funzioni factory per stub di test:
   - `makeStubBarrier(overrides?)`
   - `makeStubSemanticPageModel(overrides?)`
   - `makeStubInteractionContract(overrides?)`
   - `makeStubAuditEvent(overrides?)`
   Tutte producono oggetti validi e minimali con default sensati, coerenti con i tipi congelati
   in `@aua/contracts`.

4. Test in `packages/testing/src/__tests__/contract-validator.test.ts`: un
   SemanticPageModel valido passa lo schema; un modello con `redacted: false` fallisce; un
   modello senza campi richiesti fallisce.

5. `packages/testing/package.json`: name `@aua/testing`, version `0.1.0`, dipendenza `ajv` e
   su `@aua/contracts` (workspace:*).

Vincoli: non scrivere qui test Playwright (richiedono un setup E2E separato, fuori scope).
Resta dentro `packages/testing/`. Esegui `npm run build`/`test` limitati a questo workspace
prima di committare sul branch `feat/testing-infrastructure` (nessun push).
```
