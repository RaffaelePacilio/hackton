```
Stai rifinendo il package `packages/barrier-detection` per AUA (Agentic Universal
Accessibility Runtime). Root del repo: C:\HACKATON\new\hackton (già unificato dal repo del
compagno di squadra, dove questo package viveva prima — verifica che sia arrivato intero nella
root: `detector.ts`, `capability-mapping.ts`, e i relativi test). Lavora su un branch dedicato
`feat/barrier-detection-hardening`.

Nota: questo package non aveva un prompt di implementazione originale in
`aua/docs/agent-prompts.md` (quel piano copriva solo 20 aree e questa non era tra quelle) —
esiste comunque nel repo del compagno di squadra come "WP-012: Barrier Detection Engine" nel
grafo delle dipendenze (`aua/docs/diagrams/dependency-dag.md`), sul percorso critico
`WP-001 → WP-007 → WP-012 → WP-014 → WP-018 → WP-020`. Il tuo compito è verificarlo/irrobustirlo
e produrre la documentazione mancante, non ricominciare da zero.

Contesto — leggi prima (solo lettura):
- aua/docs/adr/ADR-005-agent-orchestration.md (il rilevamento barriere è descritto come
  servizio deterministico, non un agente LLM — coerente col fatto che questo package non
  chiama nessun provider di reasoning)
- aua/docs/architecture/04-runtime-flows.md (Scenario B — verifica che la logica di
  rilevamento coincida col flusso lì descritto, in particolare per la barriera "drag-only
  slider" che deve mappare alla skill `inject_stepper`)
- packages/contracts/src/semantic-page-model.ts (input del detector)
- packages/semantic-model/ (se già completato da un altro agente parallelo — se non ancora
  disponibile quando lavori tu, non bloccarti: verifica solo la forma dei tipi già congelata in
  `@aua/contracts`, che è sufficiente)
- packages/barrier-detection/src/*.ts per intero (stato attuale)

Il tuo compito:

1. Leggi `detector.ts` e `capability-mapping.ts` per intero. Verifica che il detector:
   - prenda in input un `SemanticPageModel` (redatto) + un `InteractionContract`
   - produca una lista di `Barrier` (`{ id, elementId, barrierType, severity, description }`,
     riusa il tipo già definito da qualche parte nel repo — verifica se è duplicato tra
     `packages/agent-runtime` e questo package e, se sì, segnala la duplicazione nel messaggio
     finale invece di deciderla tu unilateralmente se comporta un cambio di firma pubblica)
   - mappi le capability dichiarate nel contratto (motor/vision/hearing/cognitive:
     full/partial/none/unknown) alle classi di barriera rilevabili (drag-only, hover-only,
     target troppo piccolo, mancanza di ARIA, focus trap rotto, ecc.) in modo deterministico e
     senza inferire condizioni non dichiarate (coerente con ADR-004: "unknown" è trattato
     conservativamente come nessuna barriera assunta, mai come inferenza medica)
2. Se manca copertura di test per una qualsiasi delle regole di mapping capability→barriera
   già implementate, aggiungila in `packages/barrier-detection/src/__tests__/`.
3. Aggiungi un test di non-regressione esplicito per il caso "pagina accessibile al 100%" →
   nessuna barriera rilevata (baseline negativa, stesso principio della fixture
   `accessible-baseline.html` prevista per `packages/testing`).
4. Se manca, crea `packages/barrier-detection/src/index.ts` come punto di ingresso pubblico del
   package.
5. Scrivi un breve documento `aua/docs/work-packages/WP-012-barrier-detection.md` (non esiste
   ancora — gli altri WP-001..006 hanno un documento simile, seguine lo stile e la struttura)
   che descrive scope, input/output, e criteri di accettazione di questo package, così che la
   documentazione del progetto rifletta anche questo WP mancante.

Vincoli: non implementare qui la risoluzione delle barriere (quella è l'Adaptation
Planner/Agent Runtime, fuori scope) — solo il rilevamento. Resta dentro
`packages/barrier-detection/` e il singolo file di documentazione indicato. Esegui `npm run
build`/`test` limitati a questo workspace prima di committare sul branch
`feat/barrier-detection-hardening` (nessun push).
```
