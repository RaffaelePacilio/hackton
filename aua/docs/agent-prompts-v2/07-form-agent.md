```
Stai implementando da zero il package `packages/form-agent` per AUA (Agentic Universal
Accessibility Runtime). Root del repo: C:\HACKATON\new\hackton (già unificato — non occuparti
di merge). Questo package NON esiste ancora in nessuna parte del repo. Lavora su un branch
dedicato `feat/form-agent`.

Contesto: `aua/docs/adr/ADR-010-form-interaction-strategy.md` stabilisce che il Form Agent è un
servizio deterministico (NON un agente LLM) che rileva il framework sottostante e usa la
strategia di scrittura corretta. Per input controllati React: usa il setter nativo del value
via `Object.getOwnPropertyDescriptor` prima di dispatchare un evento sintetico `input`. Ogni
scrittura è seguita da verifica obbligatoria. Nessuna tecnica funziona al 100% su tutti i
framework — la verifica (non il successo cieco della scrittura) è la fonte di verità.

Leggi prima (solo lettura):
- aua/docs/adr/ADR-010-form-interaction-strategy.md
- packages/verification-engine/src/ (per capire come questo package verrà usato a valle — non
  serve integrarlo ora, solo capire la forma di VerificationResult per coerenza futura)

Il tuo compito — crea `packages/form-agent/`:

1. `packages/form-agent/src/framework-detector.ts`
   Esporta `detectFramework(el: HTMLElement): "react" | "vue" | "angular" | "native" |
   "custom-shadow" | "unknown"`:
   - `"react"`: controlla se `el` ha una proprietà con chiave che inizia per `__reactFiber` o
     `_reactFiber` o `_reactInternals` (React annota le istanze DOM così)
   - `"vue"`: controlla `el.__vue__ || el.__vue3__`
   - `"angular"`: controlla `el.__ngContext__` o `el.hasAttribute("ng-reflect-model")`
   - `"custom-shadow"`: controlla `el.shadowRoot !== null`
   - `"native"`: tagName è INPUT/TEXTAREA/SELECT e nessuna delle condizioni sopra
   - `"unknown"`: fallback

2. `packages/form-agent/src/write-strategies.ts`
   Esporta interfaccia `WriteStrategy { write(el: HTMLInputElement, value: string): boolean }`.
   - `NativeWriteStrategy`: imposta `el.value = value`, dispatcha `new Event("input", {
     bubbles: true })` e `new Event("change", { bubbles: true })`, ritorna `true`.
   - `ReactWriteStrategy`: ottiene il setter nativo
     `Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set`; se non
     disponibile, ricade su `NativeWriteStrategy`; altrimenti chiama `setter.call(el, value)` e
     dispatcha `new Event("input", { bubbles: true, cancelable: true })`; ritorna `true`.
   - `ShadowRootFallbackStrategy`: ritorna sempre `false` (non si può scrivere in sicurezza; il
     chiamante deve usare la skill `inject_field_proxy` invece).

3. `packages/form-agent/src/form-agent.ts`
   Esporta `class FormAgent`:
   - `write(el: HTMLInputElement, value: string): { success: boolean; strategy: string;
     needsProxy: boolean }`:
     a. rileva il framework
     b. sceglie la strategia: react → ReactWriteStrategy, native/vue/angular →
        NativeWriteStrategy, custom-shadow → ShadowRootFallbackStrategy, unknown →
        NativeWriteStrategy
     c. chiama `strategy.write(el, value)`
     d. se ritorna `false` → `{ success: false, strategy: "shadow-fallback", needsProxy: true }`
     e. altrimenti → `{ success: true, strategy: <nome>, needsProxy: false }`
   - `readValue(el: HTMLInputElement): string` — legge `el.value`

4. Test in `packages/form-agent/src/__tests__/write-strategies.test.ts` (ambiente jsdom —
   guarda `packages/web-components/vitest.config.ts` per la configurazione jsdom di
   riferimento già in uso nel repo):
   - `NativeWriteStrategy` imposta il valore e dispatcha gli eventi
   - `ReactWriteStrategy` usa il setter nativo quando disponibile
   - `ShadowRootFallbackStrategy` ritorna `false`
   - `detectFramework` ritorna `"native"` per un input semplice, `"react"` per un input con
     proprietà fiber annotata artificialmente nel test

5. `packages/form-agent/package.json`: name `@aua/form-agent`, version `0.1.0`.
   `packages/form-agent/tsconfig.json` che estende `tsconfig.base.json` della root.

Vincoli: nessuna chiamata LLM qui, nessuna interazione con il backend — è un servizio DOM
deterministico. Resta dentro `packages/form-agent/`. Esegui `npm run build`/`test` limitati a
questo workspace prima di committare sul branch `feat/form-agent` (nessun push).
```
