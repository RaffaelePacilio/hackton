```
Stai completando il package `packages/skill-sdk` per AUA (Agentic Universal Accessibility
Runtime). Root del repo: C:\HACKATON\new\hackton (già unificato — l'`executor.ts` che prima
esisteva solo nel repo del compagno di squadra dovrebbe già essere stato portato qui dal
passo di merge; se `packages/skill-sdk/src/executor.ts` non esiste ancora, il merge non è
completo: fermati e segnalalo invece di improvvisare una nuova implementazione da zero senza
verificare prima se ne esiste già una equivalente altrove nel repo). Lavora su un branch
dedicato `feat/skill-sdk-completion`.

Contesto: `aua/docs/adr/ADR-008-skill-registry.md` stabilisce un registro chiuso e versionato
di `SkillDefinition`. L'output dell'LLM è vincolato a coppie `{ skillId, inputs }` validate
contro lo `inputSchema` di ciascuna skill prima dell'esecuzione. Nuove skill si aggiungono solo
via PR revisionata a `packages/skill-sdk/registry/` — mai dinamicamente a runtime. Uno
`skillId` sconosciuto è un rifiuto hard, mai un fallback a codice generato. Il gating per
classe di capability è imposto nell'Executor, indipendentemente da cosa dichiara il Planner
(coerente con `ADR-014-security-boundary.md`).

IMPORTANTE — la lista di skill autorevole è quella CONGELATA in
`aua/docs/contracts/skill-contract.md`, NON quella (superata) elencata in
`aua/docs/agent-prompts.md`. Leggi `aua/docs/contracts/skill-contract.md` per la lista
completa attesa (circa 22 skill: focus_semantic_field, fill_field, read_element, read_region,
read_errors, navigate_to_intent, restore_focus, inject_field_proxy, inject_stepper,
inject_choice_list, inject_command_palette, inject_route_navigation, replace_drag,
replace_hover, increase_target_size, simplify_interaction, announce, listen, speak,
verify_field_value, verify_action_result, verify_navigation — usa la lista effettiva del
documento, questa è solo una guida di massima).

Il tuo compito:

1. Confronta i file già presenti in `packages/skill-sdk/registry/*.json` con la lista
   autorevole di `aua/docs/contracts/skill-contract.md`. Al momento risulta MANCANTE almeno
   `inject_stepper.json` (skill citata come canonica per la risoluzione della barriera "drag"
   in `aua/docs/architecture/04-runtime-flows.md`, Scenario B) — verifica e crealo se manca,
   seguendo esattamente la forma di `SkillDefinition` già usata dagli altri file JSON del
   registro (stesso schema: `skillId`, `version`, `description`, `capabilityClass`,
   `inputSchema`, `verificationStrategy`, `idempotent`, `rollback`).
2. Se trovi nel registro skill NON presenti nella lista congelata di skill-contract.md
   (ad es. residui di una versione precedente del piano), NON cancellarle senza controllare —
   verifica prima se sono referenziate da altro codice (`grep` nel repo); se sono
   effettivamente orfane e non nella lista congelata, segnalalo nel messaggio finale invece di
   cancellarle silenziosamente.
3. Aggiungi/completa `packages/skill-sdk/scripts/validate-registry.mjs` (se già esiste,
   verificane la logica) in modo che validi OGNI file in `registry/*.json` contro
   `schemas/skill-definition.schema.json`, e che fallisca (`process.exit(1)`) se una skill non
   valida o se manca una skill della lista congelata.
4. Verifica `packages/skill-sdk/src/executor.ts` (portato dal merge): deve implementare
   `class SkillExecutor` con `validate(invocation)` (controllo esistenza skillId + validazione
   input via Ajv contro l'inputSchema + controllo capabilityClass contro le classi consentite)
   e `execute(invocation)` (chiama `validate` prima, poi la logica di skill — se la vera
   esecuzione DOM è ancora uno stub, va bene, non è compito tuo implementarla qui). Se manca
   qualche caso (`skillId` sconosciuto, input non validi, classe non consentita → tutti devono
   risultare in `failureClass: "framework-blocked"`), completalo.
5. Test in `packages/skill-sdk/src/__tests__/executor.test.ts` e
   `packages/skill-sdk/scripts/__tests__/` (o dove già presenti test analoghi) per: skillId
   sconosciuto, input non validi secondo lo schema, classe di capability non consentita,
   invocazione valida → successo; e per la validazione del registro completo (tutte le skill
   della lista congelata sono presenti e valide).

Vincoli: non implementare l'esecuzione DOM reale nell'executor (resta uno stub deterministico
per ora — è compito dell'agente di integrazione finale). Resta dentro `packages/skill-sdk/`.
Esegui `npm run build`/`test` limitati a questo workspace prima di committare sul branch
`feat/skill-sdk-completion` (nessun push).
```
