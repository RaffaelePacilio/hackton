```
Stai implementando da zero il package `packages/routing-layer` per AUA (Agentic Universal
Accessibility Runtime). Root del repo: C:\HACKATON\new\hackton (già unificato — non occuparti
di merge). Questo package NON esiste ancora in nessuna parte del repo. Lavora su un branch
dedicato `feat/routing-layer`.

Contesto: `aua/docs/adr/ADR-011-routing-accessibility-layer.md` stabilisce un'osservazione
agnostica dal framework — monkey-patch di `history.pushState`/`replaceState` nel bridge
page-context, ascolto di `popstate`, correlazione con mutazioni DOM/cambi di heading.
L'annuncio del cambio di route avviene tramite `<a11y-live-region>`. Il silenzio è più sicuro
di un annuncio scorretto.

IMPORTANTE — il segnale esiste già ma non ha consumer: in
`apps/browser-extension/src/content/page-bridge.ts` (leggi, non modificare) il bridge già
posta messaggi `window.postMessage({ type: "AUA_ROUTE_CHANGE", ... })` dopo aver intercettato
`pushState`/`replaceState`, e il content-script già li riceve per ricostruire il modello
semantico — ma nessun codice li usa per annunciare il cambio o ripristinare il focus. Il tuo
compito è creare il package che CONSUMA questo tipo di segnale (in modo testabile e
disaccoppiato, non accoppiato al content-script reale) — il collegamento effettivo dentro
l'estensione lo farà un agente di integrazione successivo.

Leggi prima (solo lettura):
- aua/docs/adr/ADR-011-routing-accessibility-layer.md
- apps/browser-extension/src/content/page-bridge.ts e content-script.ts (per capire la forma
  esatta del messaggio `AUA_ROUTE_CHANGE` già in uso — non modificarli)
- packages/web-components/src/adapters/a11y-live-region.ts (l'API `announce(message,
  clearAfterMs?)` che questo package dovrà invocare tramite un'interfaccia minima, non un
  import diretto del componente)

Il tuo compito — crea `packages/routing-layer/`:

1. `packages/routing-layer/src/route-detector.ts`
   Esporta `class RouteDetector`:
   - Ascolta eventi `window.postMessage` con `{ type: "AUA_ROUTE_CHANGE" }` (stessa forma già
     postata da `page-bridge.ts`)
   - Ascolta eventi `popstate` della finestra
   - Traccia `lastUrl: string`
   - Espone `onRouteChange: ((newUrl: string, previousUrl: string) => void) | null`
   - Il costruttore accetta un riferimento a `window` (per testabilità/mock)
   - Metodi `start()` / `stop()`

2. `packages/routing-layer/src/heading-detector.ts`
   Esporta `class HeadingDetector`:
   - Accetta un'interfaccia simile a `MutationObserver` (per testabilità)
   - Osserva il documento per mutazioni su heading (h1–h3 che appaiono o cambiano testo)
   - Espone `onHeadingChange: ((heading: string) => void) | null`
   - Usato come segnale di fallback quando non arriva un evento esplicito di cambio route
   - Implementa un debounce di 200ms per evitare annunci multipli su re-render complessi

3. `packages/routing-layer/src/focus-restorer.ts`
   Esporta `class FocusRestorer`:
   - `restoreToMainHeading(): void` — porta il focus sul primo `h1` del documento, poi `h2`,
     poi `[role="main"]`, poi `document.body`
   - `restoreToLandmark(landmark: string): void` — porta il focus sul primo elemento che
     corrisponde al selettore del landmark

4. `packages/routing-layer/src/routing-accessibility-service.ts`
   Esporta `class RoutingAccessibilityService`:
   - Costruttore accetta `routeDetector`, `headingDetector`, `focusRestorer`, e
     `liveRegion: { announce(msg: string): void }` (interfaccia minima, non l'implementazione
     concreta del web component)
   - `start()`: collega `onRouteChange`/`onHeadingChange`
   - Al cambio route: annuncia "Navigato a <titolo o heading>" via `liveRegion.announce(...)`,
     poi chiama `focusRestorer.restoreToMainHeading()`
   - Al cambio heading (se nessun segnale di route entro 200ms): annuncia il cambio di heading
   - `stop()`: rimuove tutti i listener

5. Test in `packages/routing-layer/src/__tests__/routing-service.test.ts`:
   - cambio route → annuncio + ripristino focus
   - cambio heading senza segnale di route → annuncio
   - nessun annuncio falso quando non c'è nessun cambiamento

6. `packages/routing-layer/package.json`: name `@aua/routing-layer`, version `0.1.0`.

Vincoli: NON implementare qui il monkey-patch di `history.pushState`/`replaceState` (già fatto
nel content-script/page-bridge dell'estensione). Resta dentro `packages/routing-layer/`.
Esegui `npm run build`/`test` limitati a questo workspace prima di committare sul branch
`feat/routing-layer` (nessun push).
```
