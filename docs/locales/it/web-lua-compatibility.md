# WebLua Lua 5.5.1 Matrice di compatibilità

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/web-lua-compatibility.md: [docs/web-lua-compatibility.md](../../web-lua-compatibility.md)
> Lingua: Italiano (it)

Questo rapporto è intenzionalmente conservatore. `matched` significa che il comportamento è coperto da un dispositivo a livello ospite e ha un risultato atteso deterministico; `capability-gated` significa che gli effetti host richiedono una policy esplicita; `unresolved` significa che il comportamento viene monitorato ma non deve essere considerato transitorio.

| Zona | Comportamento | Stato | Prove | Note |
| ----------------------- | ----------------------------------------------------------------------------- | ---------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| sintassi lessicale | Spazi bianchi, commenti, parole chiave, valori letterali interi e operatori | abbinato | `packages/web-lua/src/differential.spec.ts` | Viene rivendicato solo il sottoinsieme scalare implementato.                                         |
| espressioni scalari | Aritmetica dei numeri interi, meno unario, raggruppamento, precedenza e confronti | abbinato | `packages/web-lua/src/differential.spec.ts` | I risultati utilizzano l'ABI scalare guest corrente.                                              |
| locali e flusso di controllo | Assegnazione locale, riassegnazione, `if`/`else`, `while` e resi | abbinato | `packages/web-lua/src/differential.spec.ts` | Le capacità guest locali e dello stack rimangono limiti espliciti.                               |
| funzioni con nome | Definizioni con nome, parametri, chiamate e rendimenti scalari | abbinato | `packages/web-lua/src/differential.spec.ts` | Chiusure, upvalue, vararg, tail call e resi multipli rimangono all'esterno di questa riga. |
| errori e caricamento | Stati di sintassi, runtime, divisione e prefisso binario con formato errato | abbinato | `packages/web-lua/src/utils/web-lua.spec.ts` | Gli stati vengono confrontati senza l'interpretazione Lua sul lato host.                            |
| librerie rivolte all'host | I/O, orologio, casualità, sistema operativo, caricamento dei pacchetti ed effetti di debug | basato sulla capacità | `packages/web-lua/src/utils/web-lua.spec.ts` | Le funzionalità sono negate per impostazione predefinita; le implementazioni della libreria sono incomplete.              |
| valori e tabelle | Stringhe, float, tabelle, dati utente, identità, iterazione e metametodi | irrisolto | `packages/web-lua/src/utils/web-lua.spec.ts` | Il limite corrente espone valori scalari e una base di tabella a una voce.           |
| chiusure e coroutine | Upvalue, `yield`/`resume`, chiamate protette ed errori di coroutine nidificati | irrisolto | `packages/web-lua/src/utils/web-lua.spec.ts` | `resume` attualmente riesegue un prototipo e non è rivendicato come semantica coroutine.  |
| librerie standard | Base, coroutine, tabella, stringa, UTF-8, matematica, I/O, sistema operativo, debug e pacchetto/caricamento | irrisolto | Nessun dispositivo differenziale della libreria standard | Nessun comportamento della libreria viene trattato silenziosamente come transitorio.                                    |

L'origine generata di questo report è la matrice tipizzata in `packages/web-lua/src/compatibility.ts`; i suoi test richiedono una classificazione esplicita e una voce di prova per ogni riga.
