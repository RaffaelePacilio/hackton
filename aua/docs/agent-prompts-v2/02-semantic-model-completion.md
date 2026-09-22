```
Stai completando il package `packages/semantic-model` per AUA (Agentic Universal
Accessibility Runtime). Root del repo: C:\HACKATON\new\hackton (già unificato — non occuparti
di merge). Lavora su un branch dedicato `feat/semantic-model-completion`.

Contesto: `aua/docs/adr/ADR-003-semantic-page-model.md` stabilisce che il modello interno è un
albero DOM aumentato da un grafo di relazioni (labelledBy/describedBy/controls/formOwner),
l'identità degli elementi è una chiave composita stabile, e la redazione è imposta alla
serializzazione (non per disciplina del consumer) — è la funzione più critica per la sicurezza
e richiede copertura di branch vicina al 100%.

PROBLEMA ATTUALE (da correggere): l'implementazione reale e funzionante del builder del
SemanticPageModel (circa 622 righe) vive dentro
`apps/browser-extension/src/semantic-model/{builder.ts,identity.ts,relationships.ts,
role-inference.ts,capability-inference.ts,sensitivity.ts}` invece che nel package
`packages/semantic-model/`, che oggi contiene solo alcuni file di supporto
(`capability-inference.ts`, `element-id.ts`, `geometry.ts`, `role-inference.ts`,
`sensitivity.ts`) senza `builder.ts`, `types.ts`, `index.ts`, e SENZA NESSUN TEST.

Leggi prima (solo lettura):
- aua/docs/adr/ADR-003-semantic-page-model.md
- aua/docs/contracts/semantic-page-model.md
- packages/contracts/src/semantic-page-model.ts e packages/contracts/src/redact.ts (i tipi e la
  redazione sono già congelati qui — RIUSALI, non ridefinirli)
- apps/browser-extension/src/semantic-model/*.ts (leggi per capire la logica reale già scritta
  — NON modificare questi file, sono di competenza dell'agente di integrazione finale; il tuo
  compito è portare la logica equivalente/riusabile dentro il package, non spostare l'app)

Il tuo compito — dentro `packages/semantic-model/`:

1. `packages/semantic-model/src/types.ts`
   Se `@aua/contracts` già esporta `SemanticElement`, `SemanticRelationship`,
   `SemanticPageModel`, `ElementId`/id-related types, ri-esportali da qui per comodità dei
   consumer di questo package, invece di duplicarli. Aggiungi solo i tipi specifici a questo
   package che non esistono ancora in `@aua/contracts` (es. tipi interni al builder come
   `BuilderNode`, `RelationshipEdge` se la logica esistente in
   `apps/browser-extension/src/semantic-model/` ne usa di analoghi).

2. `packages/semantic-model/src/builder.ts`
   Porta qui una classe `SemanticModelBuilder` funzionalmente equivalente a quella già
   implementata in `apps/browser-extension/src/semantic-model/builder.ts`, ma progettata come
   API di libreria pura (nessuna dipendenza da `chrome.*`, nessun accesso implicito al DOM
   globale se non tramite un `Document`/`Element` passato esplicitamente):
   - `addElement(el)/removeElement(id)/addRelationship(...)/removeRelationship(...)`
   - `build(): SemanticPageModel` — chiama la redazione di `@aua/contracts` internamente e
     ritorna sempre un modello con `redacted: true`
   - Riusa la logica già scritta per role-inference, sensitivity, identity/element-id,
     relationships, capability-inference presente nell'app — portala/adattala nei file già
     presenti nel package (`role-inference.ts`, `sensitivity.ts`, `capability-inference.ts`,
     `element-id.ts`, `geometry.ts`) se ha senso riusarli, altrimenti crea gli equivalenti nel
     package copiando/adattando `identity.ts` e `relationships.ts` dall'app.

3. `packages/semantic-model/src/index.ts`
   Punto di ingresso del package: ri-esporta `SemanticModelBuilder`, tipi principali, e le
   utility pubbliche (element-id, role-inference se destinate a essere usate da altri package).

4. Test in `packages/semantic-model/src/__tests__/`:
   - `builder.test.ts`: costruzione incrementale, rimozione elementi/relazioni, `build()`
     produce sempre `redacted: true`.
   - `redaction.test.ts`: verifica che il builder non esponga MAI un valore per elementi
     marcati sensibili nell'output di `build()` — copertura di tutti i branch rilevanti (elemento
     sensibile con valore, sensibile senza valore, non sensibile con valore, non sensibile senza
     valore, input malformato non deve lanciare eccezioni).
   - Se `role-inference.ts`/`sensitivity.ts`/`capability-inference.ts` non hanno già test,
     aggiungine per le regole principali di ciascuno.

5. `packages/semantic-model/package.json`: name `@aua/semantic-model`, version `0.1.0`,
   dipendenza su `@aua/contracts` (workspace:*).

Vincoli: NON modificare `apps/browser-extension/src/semantic-model/*` — quel codice verrà
ricollegato al package da un agente di integrazione successivo, il tuo lavoro è rendere il
package stesso completo, testato e importabile in autonomia (`import { SemanticModelBuilder }
from "@aua/semantic-model"` deve funzionare da un altro package). Resta dentro
`packages/semantic-model/`. Esegui `npm run build`/`test` limitati a questo workspace prima di
committare sul branch `feat/semantic-model-completion` (nessun push).
```
