```
Stai completando il package `packages/voice` per AUA (Agentic Universal Accessibility
Runtime). Root del repo: C:\HACKATON\new\hackton (già unificato — non occuparti di merge).
Lavora su un branch dedicato `feat/voice-completion`.

Contesto: `aua/docs/adr/ADR-007-voice-architecture.md` stabilisce un'interfaccia
`SpeechProvider` implementata da due modalità — speech-to-speech realtime (primaria,
bassa latenza) e pipeline concatenata STT→Agent→TTS (fallback per data-residency/
auditabilità). Catena di fallback automatica obbligatoria: realtime → chained →
STT nativo browser/OS. Se tutte falliscono, i percorsi non-voce restano disponibili.

STATO ATTUALE: il package esiste già con `types.ts` e
`providers/{native-stt-provider.ts, null-provider.ts, openai-realtime-provider.ts}`, ma:
- manca `src/index.ts` (nessun punto di ingresso — il package non è importabile da fuori)
- manca `src/speech-fallback-chain.ts` (la catena di fallback obbligatoria da ADR-007 non
  esiste come codice — esistono solo provider isolati e non collegati)
- manca completamente `src/__tests__/`

Leggi prima (solo lettura):
- aua/docs/adr/ADR-007-voice-architecture.md
- packages/voice/src/types.ts (interfaccia SpeechProvider già definita — non modificarla se
  già coerente con l'ADR; se manca qualcosa aggiungila in modo retrocompatibile)
- packages/voice/src/providers/*.ts (leggi le implementazioni esistenti prima di scrivere la
  catena di fallback)

Il tuo compito:

1. `packages/voice/src/speech-fallback-chain.ts`
   Esporta `class SpeechFallbackChain implements SpeechProvider`:
   - Costruttore accetta `providers: SpeechProvider[]` (ordine: realtime, poi chained, poi
     nativo)
   - `mode`: la mode del primo provider sano (chiama `healthCheck()` in ordine), altrimenti
     `"chained"`
   - Ogni metodo (`startSession`, `transcribe`, `synthesize`, `interrupt`, `healthCheck`) provi
     i provider in ordine; in caso di errore/eccezione passa al successivo
   - Se tutti falliscono: non deve mai lanciare un'eccezione non gestita verso il chiamante —
     ritorna/produce un risultato degradato equivalente a quello di `NullSpeechProvider` (se
     esiste già in `null-provider.ts`, riusalo; altrimenti crealo secondo lo schema:
     `mode: "chained"`, `startSession` ritorna una sessione minima, `transcribe` produce un solo
     evento `{ type: "end" }`, `synthesize` produce un solo `Uint8Array` vuoto, `interrupt`
     no-op, `healthCheck` sempre `false`)

2. `packages/voice/src/index.ts`
   Punto di ingresso: ri-esporta tipi da `types.ts`, tutti i provider da `providers/`, e
   `SpeechFallbackChain`.

3. Test in `packages/voice/src/__tests__/fallback-chain.test.ts`:
   - primario fallisce (mock che lancia/rifiuta) → usa il secondario con successo
   - tutti falliscono → risultato equivalente a `NullSpeechProvider` (nessuna eccezione
     propagata al chiamante)
   - `healthCheck()` della catena ritorna `true` se almeno un provider è sano
   - `mode` riflette il provider sano di priorità più alta

4. Se manca, aggiungi test minimi anche per i provider esistenti
   (`native-stt-provider.test.ts`, `null-provider.test.ts`) coprendo almeno: comportamento
   quando l'API nativa non è disponibile (deve lanciare/gestire un errore chiaro, non un
   crash silenzioso), e che `NullProvider`/`null-provider` rispetti sempre la forma dei tipi.

Vincoli: non implementare chiamate HTTP reali a vendor STT/TTS diversi da quelli già presenti
(`openai-realtime-provider.ts` esiste già — non aggiungerne altri). Resta dentro
`packages/voice/`. Esegui `npm run build`/`test` limitati a questo workspace prima di
committare sul branch `feat/voice-completion` (nessun push).
```
