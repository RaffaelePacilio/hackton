```
Stai implementando da zero il package `packages/security` per AUA (Agentic Universal
Accessibility Runtime). Root del repo: C:\HACKATON\new\hackton (già unificato — non occuparti
di merge). Questo package NON esiste ancora in nessuna parte del repo. Lavora su un branch
dedicato `feat/security-boundary`.

Contesto: `aua/docs/adr/ADR-014-security-boundary.md` stabilisce che gli LLM non ricevono MAI
API browser privilegiate non ristrette — è un invariante hard. I reasoning provider ricevono
solo slice redatte del SemanticPageModel e ritornano output strutturato vincolato da schema.
Nessun `eval`, nessun codice dinamico. Il prompt injection è mitigato togliendo testo libero
dagli input al modello. Ogni invocazione di skill valida contro lo schema prima
dell'esecuzione.

NOTA: oggi il gating per classe di capability esiste solo INLINE dentro
`packages/skill-sdk/src/executor.ts` (verificato dopo il merge col repo del compagno). ADR-014
implica un secondo livello di verifica INDIPENDENTE, non un unico punto di controllo — è
questo il compito di questo package: non duplicare la logica dell'executor, ma fornire un
guard riusabile e indipendente che un chiamante a monte (Planner/Orchestrator) può invocare
PRIMA di arrivare all'executor, così il controllo avviene in due punti indipendenti.

Leggi prima (solo lettura):
- aua/docs/adr/ADR-014-security-boundary.md
- packages/skill-sdk/src/executor.ts e types.ts (per capire `CapabilityClass` già definito e
  come l'executor fa oggi il gating — NON duplicarlo, il tuo `PermissionGuard` è un secondo
  livello indipendente, riusa il tipo `CapabilityClass` importandolo da `@aua/skill-sdk` invece
  di ridefinirlo)

Il tuo compito — crea `packages/security/`:

1. `packages/security/src/invariants.ts`
   Esporta `assertNeverSendRawDom(slice: unknown): void` — attraversa l'oggetto; se un
   qualsiasi valore stringa supera 5000 caratteri (euristica per contenuto DOM grezzo), lancia
   `Error("security: raw DOM content detected in provider input")`.
   Esporta `assertRedactedSlice(slice: unknown): void` — verifica che l'oggetto non abbia un
   campo `"value"` a livello di elemento dove `sensitive` è `true`; lancia se lo trova.

2. `packages/security/src/prompt-injection-guard.ts`
   Esporta `sanitizeForProvider(input: string): string` — rimuove pattern comuni di prompt
   injection: sottostringhe che iniziano con "Ignore previous instructions", "System:",
   "You are now", "SYSTEM PROMPT", tag angolari (`<...>`); troncamento a 2000 caratteri massimo;
   ritorna la stringa pulita.
   Esporta `containsInjectionPattern(input: string): boolean` — `true` se rilevato un pattern
   di injection (usato per logging/alerting).

3. `packages/security/src/permission-guard.ts`
   Esporta `class PermissionGuard`:
   - Costruttore accetta `allowedClasses: CapabilityClass[]` (importato da `@aua/skill-sdk`)
   - `checkCapability(cls: CapabilityClass, confirmBeforeAction: boolean): "allow" |
     "require-confirm" | "block"`:
     - `AUTHENTICATE`, `PAYMENT`, `DESTRUCTIVE` → sempre `"require-confirm"` indipendentemente
       da `confirmBeforeAction`
     - `SUBMIT` → `"require-confirm"` se `confirmBeforeAction` è `true`, altrimenti `"allow"`
     - altre classi → `"allow"` se in `allowedClasses`, altrimenti `"block"`
   - Questo ri-valida a livello di guard, indipendentemente da cosa dichiarano
     Planner/Executor

4. `packages/security/src/csp-checker.ts`
   Esporta `checkExtensionCsp(policy: string): { valid: boolean; violations: string[] }` —
   verifica che la CSP non contenga `unsafe-eval`/`unsafe-inline` in `script-src`, che
   `script-src` non contenga wildcard `*`, che `connect-src` non permetta `*`.

5. Test in `packages/security/src/__tests__/prompt-injection-guard.test.ts` (pattern noti
   catturati, input pulito passa, troncamento a 2000 caratteri) e
   `packages/security/src/__tests__/permission-guard.test.ts` (DESTRUCTIVE sempre richiede
   conferma, SUBMIT rispetta la preferenza, classe non consentita è bloccata).

6. `packages/security/package.json`: name `@aua/security`, version `0.1.0`, dipendenza su
   `@aua/skill-sdk` (workspace:*) per il tipo `CapabilityClass`.

Vincoli: non aggiungere chiamate HTTP o accesso ad API browser qui. Resta dentro
`packages/security/`. Esegui `npm run build`/`test` limitati a questo workspace prima di
committare sul branch `feat/security-boundary` (nessun push).
```
