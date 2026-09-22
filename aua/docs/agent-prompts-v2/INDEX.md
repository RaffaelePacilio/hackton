# AUA — Piano di completamento (v2)

Questa cartella sostituisce, per lo scope non ancora completato, `aua/docs/agent-prompts.md`
(che è rimasto ancorato a un piano iniziale, con un path errato
`c:\Users\shwarnlata.kumari\hackton\hackton` e specifiche in alcuni punti disallineate dai
contratti già congelati in `aua/docs/contracts/`).

## Scoperta chiave dell'analisi

Il repo di lavoro (`C:\HACKATON\new\hackton`) contiene, non tracciata da git, una cartella
`hackton/hackton/` che è un **clone git separato** (remote `github.com/RaffaelePacilio/hackton`,
3 commit) — il lavoro di un compagno di squadra. Quel repo è molto più avanti sulla maggior
parte dei package condivisi:

| Package | Root | `hackton/hackton/` |
|---|---|---|
| `packages/contracts` | presente | **identico** (stessi file) |
| `packages/observability` | presente | presente ma **diverso file-per-file** |
| `packages/skill-sdk` | presente, senza `executor.ts` | presente, **con** `executor.ts` |
| `packages/web-components` | solo framework base | framework base + 2 adapter reali |
| `packages/agent-runtime` | assente | presente (orchestrator + provider stub/null) |
| `packages/barrier-detection` | assente | presente |
| `packages/mobile-pairing` | assente | presente, buono |
| `packages/semantic-model` | assente/parziale | parziale (builder reale è dentro l'app, non nel package) |
| `packages/verification-engine` | assente | presente, senza test |
| `packages/voice` | assente | presente, senza `index.ts`/fallback-chain/test |
| `apps/browser-extension` | scaffold vecchio, stub | più completo (semantic-model reale, bootstrap popup) |

Nessuno dei due repo ha ancora: `packages/shared`, `packages/form-agent`,
`packages/routing-layer`, `packages/state`, `packages/security`, `packages/privacy`,
`packages/testing`, `packages/persistence`, `packages/session-gateway`. E in nessuno dei due
esiste un vero cablaggio end-to-end nell'estensione (il content-script costruisce il
SemanticPageModel ma non chiama barrier-detection → agent-runtime → skill-sdk →
web-components → verification-engine → observability).

## Come procedere — NON lanciare tutto insieme

### Wave 0 — 1 agente, sequenziale, BLOCCANTE
File: `00-PREREQUISITE-merge-teammate-repo.md`
Deve finire (ed essere verificato con una build) **prima** di lanciare qualsiasi agente della
Wave 1. Unifica i due repo in un'unica sorgente di verità dentro la root e sistema
build/test/lint a livello di monorepo. Se questo passo viene saltato, gli agenti della Wave 1
lavorano su una base incoerente/duplicata e producono merge conflict garantiti.

### Wave 1 — 17 agenti, PARALLELI (una sessione Claude Code per ciascuno)
Ogni prompt indica un solo package/cartella di competenza, su un branch dedicato
`feat/<nome-package>`. Verificato che i 17 prompt non si sovrappongano su nessun file.

| File | Package | Stato prima |
|---|---|---|
| `01-shared-protocol.md` | `packages/shared` | assente |
| `02-semantic-model-completion.md` | `packages/semantic-model` | parziale/spostato |
| `03-voice-completion.md` | `packages/voice` | parziale |
| `04-agent-runtime-provider-chain.md` | `packages/agent-runtime` | parziale |
| `05-skill-sdk-completion.md` | `packages/skill-sdk` | parziale |
| `06-web-components-adapters.md` | `packages/web-components` | parziale (2/11 adapter) |
| `07-form-agent.md` | `packages/form-agent` | assente |
| `08-routing-layer.md` | `packages/routing-layer` | assente |
| `09-state-management.md` | `packages/state` | assente |
| `10-security-boundary.md` | `packages/security` | assente |
| `11-privacy.md` | `packages/privacy` | assente |
| `12-observability-hardening.md` | `packages/observability` | parziale (post-merge) |
| `13-verification-engine-hardening.md` | `packages/verification-engine` | senza test |
| `14-testing-infrastructure.md` | `packages/testing` | assente |
| `15-persistence.md` | `packages/persistence` | assente |
| `16-session-gateway-deployment.md` | `packages/session-gateway` + CI | assente |
| `17-barrier-detection-hardening.md` | `packages/barrier-detection` | presente, senza template originale |

### Wave 2 — 1 agente, sequenziale, DOPO che tutta la Wave 1 è mergiata in main
File: `99-vertical-slice-integration.md`
Collega davvero tutti i pezzi dentro `apps/browser-extension`, secondo lo Scenario B di
`aua/docs/architecture/04-runtime-flows.md`. Non lanciarlo finché i package della Wave 1 non
sono mergiati — dipende da (quasi) tutti loro.

## Nota su "n agenti in parallelo"
17 è il numero di fronti realmente indipendenti trovati dall'analisi. Wave 0 e Wave 2 vanno
eseguite da sole (rispettivamente prima e dopo), non incluse nel conteggio dei paralleli.
