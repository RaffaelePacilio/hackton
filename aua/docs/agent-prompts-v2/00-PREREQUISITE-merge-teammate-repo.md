# WAVE 0 (PREREQUISITO, ESEGUIRE DA SOLO, NON IN PARALLELO)

```
Stai lavorando sul monorepo "AUA" (Agentic Universal Accessibility Runtime), un runtime a
estensione browser che rende accessibili siti di terze parti senza modificarne il codice.
Root del repo di lavoro: C:\HACKATON\new\hackton (repo git, branch main, remote non impostato
o non rilevante — non pushare nulla).

CONTESTO CRITICO: dentro la root esiste una sottocartella `hackton/` (quindi
`C:\HACKATON\new\hackton\hackton\`) che è un CLONE GIT SEPARATO e INDIPENDENTE
(remote `origin` = https://github.com/RaffaelePacilio/hackton.git, 3 commit: "first commit",
"first push", "Merge branch 'main' of ...") — è il lavoro di un compagno di squadra, fatto
sullo stesso progetto/architettura ma non ancora integrato nella root. Il tuo compito è
UNIFICARE i due alberi in un'unica sorgente di verità dentro la root, poi eliminare la
sottocartella `hackton/` annidata (dopo aver confermato che tutto il contenuto utile è stato
portato nella root). Non toccare la cartella `.git` della root né fare push.

Leggi prima questi documenti per capire l'architettura e i contratti congelati (non li
modificare):
- aua/docs/architecture/00-executive-summary.md
- aua/docs/contracts/*.md
- aua/docs/adr/ADR-001.md … ADR-020.md (decisioni di riferimento)

## Passo 1 — Inventario differenze
Per ciascuno di questi package, confronta root `packages/<nome>/` con
`hackton/packages/<nome>/` (se esiste solo in uno dei due, è semplice: copia quello che manca
nella root):
- contracts — risulta identico nei due repo: tieni la versione della root, elimina soltanto
  il duplicato in `hackton/packages/contracts` quando arrivi al passo di pulizia.
- observability, skill-sdk, web-components — esistono in ENTRAMBI ma i file differiscono.
  Per ciascun file che differisce: leggi entrambe le versioni, e tieni quella più completa
  (più logica reale, più test, più aderente alla ADR corrispondente — ADR-016 per
  observability, ADR-008/014 per skill-sdk, ADR-009 per web-components). NON scartare in
  silenzio logica di redazione/sicurezza presente in una sola delle due versioni: se una
  versione ha un controllo che l'altra non ha, portalo nella versione finale unificata anche
  se richiede un piccolo merge manuale riga per riga. In particolare per skill-sdk:
  `hackton/packages/skill-sdk/src/executor.ts` esiste solo nel repo del compagno — la root non
  ha alcun executor — quindi va portato as-is nella root (poi verrà rifinito da un altro agente
  dedicato, tu limitati a portarlo e farlo compilare).
- agent-runtime, barrier-detection, mobile-pairing, semantic-model, verification-engine, voice
  — esistono SOLO in `hackton/packages/<nome>/`. Copia l'intera cartella dentro
  `packages/<nome>/` nella root, aggiorna `package.json`/`tsconfig.json` se necessario per
  coerenza con gli altri package della root (stesso stile di script, stessa versione
  TypeScript), e verifica che compili.
- apps/browser-extension — root ha uno scaffold più vecchio (content-script/service-worker
  con `buildSemanticModel()` no-op); `hackton/apps/browser-extension/src/` ha una versione più
  completa (semantic-model builder reale da 622 righe, bootstrap popup.html/css/ts, page-bridge,
  storage, uuid, test). Sostituisci il contenuto di `apps/browser-extension/src/` nella root
  con quello di `hackton/apps/browser-extension/src/` (root -> versione del compagno), MA prima
  fai un backup logico (es. `git stash` non serve perché sono file non tracciati — semplicemente
  non cancellare nulla finché non hai confermato che la copia è completa e superiore). Copia
  anche `manifest.json`/`package.json`/`jest.config.js`/`tsconfig.json` se differiscono in modo
  sostanziale (mantieni la history/naming della root dove equivalente).
- spikes/voice-benchmark — controlla se `hackton/spikes/voice-benchmark/results/` contiene
  risultati reali (non solo `.gitkeep`) diversi da quelli nella root; se sì, portali nella root.

## Passo 2 — Config di monorepo a livello di root
1. `package.json` nella root attualmente ha solo `name`, `private`, `workspaces`. Aggiungi
   script npm che orchestrano tutti i package via workspace, ad es.:
   ```json
   "scripts": {
     "build": "npm run build --workspaces --if-present",
     "test": "npm run test --workspaces --if-present",
     "lint": "npm run lint --workspaces --if-present",
     "typecheck": "npm run typecheck --workspaces --if-present"
   }
   ```
   Verifica che ogni package sotto `packages/*` e `apps/*` abbia effettivamente script
   `build`/`test` nel proprio `package.json` (aggiungili se manca, tipicamente
   `"build": "tsc -b"`, `"test": "vitest run"` o `"test": "jest"` — guarda cosa usa già la
   maggioranza dei package esistenti e sii coerente).
2. Concilia `tsconfig.base.json` — la root ha una versione, `hackton/tsconfig.base.json` ne ha
   un'altra con `module`/`target` diversi. Scegli UNA configurazione (preferisci quella che fa
   compilare senza errori il maggior numero di package copiati al Passo 1) e falla ereditare da
   tutti i `tsconfig.json` dei package.
3. Esegui `npm install` nella root (i `node_modules` non sono trackati/non servono in
   `hackton/`, ma se `hackton/package-lock.json` ha versioni di dipendenze diverse e più recenti
   per pacchetti condivisi come `ajv`, `vitest`, `typescript`, tienile in considerazione).
4. Esegui `npm run build` e `npm run test` a livello di root. Per ogni package che non
   compila o non passa i test dopo il merge, annota l'errore in un file
   `aua/docs/agent-prompts-v2/MERGE-NOTES.md` (crealo) con: nome package, errore, causa
   probabile, e SE lo risolvi tu stesso (preferibile per errori banali di import/path) o se lo
   lasci annotato per l'agente dedicato a quel package nella Wave 1 (per problemi di design/
   logica che richiedono decisioni non ovvie).

## Passo 3 — Pulizia
Una volta che hai confermato (build verde o quasi, differenze portate) che tutto il contenuto
utile di `hackton/hackton/` (cioè la cartella `hackton/` dentro la root, che contiene un
secondo `.git`) è stato integrato nella root:
1. Elimina la cartella annidata `hackton/` (root-level, quella con `.git` proprio) INCLUSO il
   suo `.git` interno — non è un submodule registrato, è solo una cartella con un repo dentro,
   quindi va rimossa con una `rm -rf` mirata a quel path esatto, non con comandi git che
   toccano la root.
2. Verifica con `git status` nella root che la cartella `hackton/` non compaia più e che tutti
   i file utili copiati compaiano come nuovi file sotto `packages/`, `apps/`, `spikes/`.
3. NON fare commit automaticamente: lascia lo stato pronto (staged o no, a tua scelta) e
   riporta nel messaggio finale un riepilogo di cosa hai portato, cosa hai scartato e perché,
   e il contenuto di `MERGE-NOTES.md` se l'hai creato.

## Vincoli
- Non pushare nulla, non toccare remote.
- Non inventare funzionalità nuove: questo è un lavoro di unificazione/reconciliazione, non di
  nuova implementazione.
- Se una scelta tra due versioni di un file non è ovvia (entrambe incomplete in modi diversi),
  preferisci la versione con più test e più logica di sicurezza/redazione, e documenta la
  scelta in MERGE-NOTES.md.
```
