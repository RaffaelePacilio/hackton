```
Stai implementando da zero il package `packages/session-gateway` e la configurazione CI/lint di
root per AUA (Agentic Universal Accessibility Runtime). Root del repo:
C:\HACKATON\new\hackton (già unificato — gli script build/test/lint di root e
`tsconfig.base.json` dovrebbero già esistere dopo la Wave 0; se non esistono ancora, aggiungili
tu qui senza sovrascrivere lavoro non tuo senza controllare prima). Lavora su un branch
dedicato `feat/session-gateway-deployment`.

Contesto: `aua/docs/adr/ADR-020-deployment-topology.md` stabilisce servizi backend
containerizzati (Session Gateway, Agent Orchestration Service, Skill Registry Service, Mobile
Pairing Service) dietro un load balancer. Il Session Gateway è l'unico ingresso. Il servizio
voce è stateless e scalato indipendentemente. Il versioning dello schema delle skill è solo
additivo così le estensioni più vecchie parlano in sicurezza con backend più nuovi. Collector
OTel come sidecar. Ogni servizio fallisce indipendentemente; il Session Gateway ha circuit
breaker per ogni downstream.

Leggi prima (solo lettura):
- aua/docs/adr/ADR-020-deployment-topology.md
- packages/persistence/src/session-repository.ts (se già esiste dopo l'implementazione di un
  altro agente parallelo — se non esiste ancora quando lavori tu, usa una
  `InMemorySessionRepository` locale minimale equivalente, senza bloccarti in attesa)

Il tuo compito:

1. `packages/session-gateway/src/index.ts` — uno stub minimale HTTP + WebSocket (Express o
   `http.createServer` puro, scegli quello più coerente con le dipendenze già usate altrove nel
   repo):
   - `GET /health` → `{ status: "ok", version: "0.1.0", timestamp: Date.now() }`
   - `POST /session` → crea una nuova sessione (usa `InMemorySessionRepository.createSession`
     da `@aua/persistence` se disponibile, altrimenti un equivalente locale), ritorna
     `{ sessionId }`
   - Upgrade WebSocket su `/ws/:sessionId` → accetta la connessione, alla apertura fa echo di
     `{ type: "connected", sessionId }`
   - `GET /degraded` → `{ degraded: false }` (placeholder di stato circuit-breaker)
   Esporta `startGateway(port: number): http.Server`.

2. Test in `packages/session-gateway/src/__tests__/gateway.test.ts` (supertest o `http`
   semplice): `GET /health` ritorna 200; `POST /session` ritorna un `sessionId`; `GET
   /degraded` ritorna `degraded: false`.

3. `packages/session-gateway/package.json`: name `@aua/session-gateway`, version `0.1.0`,
   dipendenze `express` (o nessuna per http grezzo) e `ws`.

4. Verifica/crea a livello di root (solo se non già presenti dalla Wave 0 — controlla prima
   con `git status`/lettura file, non sovrascrivere lavoro esistente senza motivo):
   - `.github/workflows/ci.yml`: job `build-and-test` su `ubuntu-latest`, checkout, setup-node
     20, `npm ci`, `npm run build`, `npm test -- --coverage`, `npm run lint`.
   - `.eslintrc.json` di root: `{ "root": true, "parser": "@typescript-eslint/parser",
     "plugins": ["@typescript-eslint"], "extends": ["eslint:recommended",
     "plugin:@typescript-eslint/recommended"], "rules": { "no-eval": "error",
     "@typescript-eslint/no-explicit-any": "warn" } }`.
   Se `package.json` di root non ha ancora gli script `build`/`test`/`lint` a livello di
   workspace, aggiungili (vedi `00-PREREQUISITE-merge-teammate-repo.md` per la forma esatta
   attesa) — ma se sono già presenti, non toccarli.

Vincoli: non implementare vere connessioni a database o vera infrastruttura cloud — questo è
solo lo scaffold del monorepo e lo stub del session-gateway. Resta dentro
`packages/session-gateway/` e i file di config di root elencati sopra. Esegui `npm run
build`/`test` limitati a questo workspace prima di committare sul branch
`feat/session-gateway-deployment` (nessun push).
```
