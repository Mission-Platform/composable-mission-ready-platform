# Forgia WebScript v1

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> Fonte inglese: [docs/forge-web-script.md](../../forge-web-script.md)
> Lingua: Italiano (it)

Forgia script Web (`.fws`) è un linguaggio piccolo e generico per WebAssembly
carichi di lavoro. È incentrato sul web, basato sulle capacità e deliberatamente indipendente da esso
Vue, React, il DOM e il compilatore del componente Forge. Questo documento è il
contratto di linguaggio e modulo v1 autorevole. IL TypeScript pacchetto
`@mission-platform/forge-web-script` contiene il parser bootstrap eseguibile,
controllo del tipo, tipi manifest ABI e dispositivi di conformità.

## Stato e versione

Il contratto attuale è in **versione linguistica `1.0`** e ** versione logica ABI
`1.0`**. La versione linguistica descrive sorgente e semantica; la versione dell'ABI
descrive il limite WebAssembly e il protocollo host. Sono versione
in modo indipendente. Un compilatore deve scrivere entrambe le versioni in ogni modulo generato
manifest e un caricatore deve convalidarli entrambi prima dell'istanziazione.

Il formato di origine è il testo UTF-8 con l'estensione `.fws` estensione. Un file sorgente è un file
singolo modulo. L'input del compilatore identifica la versione della lingua, mentre il file
manifest generato è l'indicatore di versione persistente utilizzato dai caricatori. Futuro
le revisioni possono aggiungere un pragma sorgente, ma la v1 non ne richiede uno; un compilatore v1
deve rifiutare un costrutto sorgente che non comprende piuttosto che indovinarlo
versione.

## Riferimento lessicale

Gli spazi bianchi sono insignificanti tranne che all'interno delle stringhe. `//` inizia un commento che
corre fino alla fine della riga. Gli identificatori iniziano con `A-Z`, `a-z`, O `_`, e
continuare con quei caratteri o cifre decimali. Gli identificatori sono
con distinzione tra maiuscole e minuscole. I valori letterali interi sono sequenze decimali non negative; v1 lo fa
non accettare la sintassi letterale esadecimale, ottale o in virgola mobile nel file
sottoinsieme bootstrap. Le stringhe utilizzano virgolette doppie ed escape compatibili con JSON e
sono valori UTF-8.

Le parole riservate sono `as`, `capability`, `else`, `export`, `fn`, `if`,
`import`, `let`, `module`, E `return`. `true` E `false` sono booleani
letterali. La punteggiatura è `{ } ( ) : ; ,`; gli operatori sono `! % * + - / < <= ==
!= > >= && || = ->`.

Ogni intervallo diagnostico è un intervallo di offset source semiaperto `[start, end)` nel
UTF-16 originale TypeScript stringa (gli offset contano le unità di codice UTF-16), con
campi di riga e colonna a base unica. Il
L'implementazione bootstrap riporta insieme gli offset e i dati di riga/colonna, quindi a
Vite l'adattatore può produrre diagnostica mappata all'origine senza eseguire l'analisi.

## Grammatica delle fonti

La grammatica seguente descrive la superficie di bootstrap v1. La grammatica usa
`*` E `?` nel consueto senso EBNF:

```ebnf
module       = "module", identifier, "{", { import | function }, "}" ;
import       = "import", "capability", string, "as", identifier,
               "(", [ parameters ], ")", "->", type, ";" ;
function     = [ "export" ], "fn", identifier, "(", [ parameters ], ")",
               "->", type, block ;
parameters   = parameter, { ",", parameter } ;
parameter    = identifier, ":", type ;
block        = "{", { statement }, "}" ;
statement    = "let", identifier, ":", type, "=", expression, ";"
             | "return", [ expression ], ";"
             | "if", expression, block, [ "else", block ]
             | expression, ";" ;
type         = "bool" | "bytes" | "f32" | "f64" | "i32" | "i64"
             | "string" | "u32" | "u64" | "unit" ;
expression   = literal | identifier | call | unary | binary ;
call         = identifier, "(", [ expression, { ",", expression } ], ")" ;
unary        = ( "!" | "-" ), expression ;
literal      = integer | string | "true" | "false" ;
```

Gli operatori binari seguono questi livelli di precedenza, dal più forte al più debole:
`* / %`, `+ -`, confronti ordinati, uguaglianza, `&&`, E `||`. Gli operatori lo sono
associativo di sinistra. Le espressioni tra parentesi sono riservate per il successivo bootstrap
revisione; un compilatore deve emettere una diagnostica di analisi anziché silenziosamente
accettandoli oggi.

## Tipi e semantica

V1 ha i tipi primitivi `bool`, firmato `i32`/`i64`, non firmato `u32`/`u64`,
`f32`/`f64`, `string`, `bytes`, E `unit`. Non ci sono valori numerici impliciti
conversioni. Gli operandi aritmetici devono avere lo stesso tipo numerico; confronti
produrre `bool`; gli operatori logici richiedono `bool`; l’uguaglianza richiede uguale
tipi. Una funzione ha un tipo di risultato dichiarato e a `unit` la funzione ritorna
senza un valore.

`string` E `bytes` sono i valori aggregati v1. Una stringa è immutabile
sequenza di valori scalari Unicode rappresentati come UTF-8 al confine ABI.
I byte sono una sequenza immutabile di ottetti e possono contenere qualsiasi valore da
`0x00` Attraverso `0xff`. Le loro operazioni a livello di sorgente sono intenzionalmente piccole
nel sottoinsieme bootstrap; forniscono le chiamate host e i moduli successivi della libreria standard
operazioni di codifica, suddivisione e raccolta senza aggiungere il browser ambientale
API per la lingua.

Le variabili locali hanno un ambito di funzione, vengono inizializzate esattamente una volta e non possono essere lette prima
la loro dichiarazione. Una dichiarazione locale non nasconde alcun nome esistente: duplicato
i nomi sono un errore. Le funzioni e gli alias di capacità condividono uno spazio dei nomi del modulo
e deve essere unico. Una chiamata deve nominare una funzione dichiarata o importata
capacità e i relativi tipi di arità e argomento devono corrispondere esattamente.

La superficie del flusso di controllo v1 è strutturata `if`/`else` e presto `return`.
Non vi è alcun risultato implicito di fall-through: ogni percorso raggiungibile in un non-`unit`
la funzione deve restituire il tipo dichiarato. Il controllo bootstrap segnala il ritorno
errori di tipo; l'analisi della raggiungibilità è un follow-up necessario prima di dichiarare a
compilatore completamente conforme a v1.

## Dichiarazioni ed esportazioni del modulo

Solo le dichiarazioni precedute da `export` sono pubblici. I nomi delle esportazioni sono stabili,
stringhe con distinzione tra maiuscole e minuscole e sono ordinate lessicograficamente in un file generato
manifesto. Le funzioni private possono essere utilizzate dalle funzioni esportate ma non lo sono
visibile all'host. Non è prevista alcuna esportazione di caratteri jolly né importazione di ambiente.

Le importazioni di capacità hanno un nome tra virgolette, di proprietà dell'host e un alias locale ospite:

```fws
import capability "clock.now" as now() -> i64;

export fn current_time() -> i64 {
  return now();
}
```

Il nome della funzionalità, l'alias, i nomi/tipi dei parametri e il tipo di risultato tra virgolette lo sono
tutto incluso nel manifesto. Le importazioni sono deterministiche: alias duplicati o
le dichiarazioni di capacità vengono rifiutate e i nomi di capacità richiesti lo sono
deduplicato e ordinato. L'host fornisce le implementazioni in base al nome della capacità;
il guest non può scoprire o richiamare una funzionalità che è assente dal suo
manifesto.

## Capacità logica ABI

Forge Web Script utilizza un confine _logico_ ispirato a WASI, non una pretesa di pieno
Compatibilità WASI. Una capacità è una funzione host ristretta ed esplicita come
`clock.now`, `random.bytes`, O `storage.read`. I nomi delle funzionalità sono di proprietà di
la piattaforma e ogni nome ha una firma con versione separata. oggetti DOM,
`window`, `document`, Node built-in, client di rete e altri browser globali
non sono mai dipendenze guest ambientali.

Il caricatore esegue questi controlli prima dell'istanziazione:

1. Sono supportati il ​​formato manifest, la versione della lingua e la versione ABI.
2. Tutte le funzionalità richieste sono presenti nel registro host.
3. Ogni funzionalità fornita ha la firma esatta dichiarata e nessuna non dichiarata
   l'importazione degli ospiti è accettata.
4. Le dichiarazioni di memoria, allocatore, esportazione e importazione sono interne
   coerente.

L'individuazione delle capacità è un'operazione host esplicita. Un host può esporre a
inventario delle capacità nel codice dell'applicazione, ma l'ospite riceve solo il file
importazioni dichiarate dal suo modulo. Le funzionalità mancanti o negate falliscono con a
tempo di caricamento `CapabilityDenied` trappola; non lo diventano `undefined` o a
silenzioso no-op.

## Valori, memoria lineare e proprietà

Il modulo utilizza una memoria lineare WebAssembly con pagine da 64 KiB e little-endian
valori scalari. I valori scalari vengono mappati come segue:

| Forgia script Web | Rappresentazione WebAssembly |
| ----------------- | ------------------------------------------ |
| `bool`            | `i32`, Dove `0` è falso e `1` è vero |
| `i32`, `u32`      | `i32`                                      |
| `i64`, `u64`      | `i64`                                      |
| `f32`, `f64`      | corrispondente WebAssembly float |
| `unit`            | nessun valore risultato |
| `string`, `bytes` | due `u32` valori: puntatore quindi lunghezza in byte |

Il manifest dichiara la stessa mappatura in `valueRepresentations`. A
La coppia puntatore-lunghezza viene sempre controllata come intervallo senza segno prima di leggere o
scrivendo: `pointer <= memory.byteLength` E `length <= byteLength - pointer`.
La lunghezza zero è valida e può utilizzare qualsiasi puntatore in-bounds, inclusa la fine di
memoria. Un controllo fallito intrappola con `MemoryOutOfBounds` e non espone mai a
valore parzialmente decodificato.

Il modulo generato viene esportato `fws_alloc(size: u32) -> u32` E
`fws_dealloc(pointer: u32, size: u32) -> unit` come confine di proprietà per
buffer. Il chiamante che alloca un buffer ne è il proprietario e deve deallocarlo
utilizzando lo stesso modulo. Le implementazioni host devono copiare i byte di input prima del file
la chiamata guest ritorna a meno che il manifest non introduca esplicitamente un futuro preso in prestito
contratto tampone. Il codice ospite non deve conservare un puntatore di proprietà dell'host dopo un host
chiamare. Il fallimento dell'allocazione si intrappola con `MemoryExhausted`; doppiamente libero e non valido
trappola gratuita con `InvalidOwnership`.

Le eccezioni host vengono convertite in `HostError` con il nome della capacità e un file
codice di errore host opaco. Le trappole per gli ospiti non vengono mai convertite in restituzione ordinaria
valori. Gli host possono registrare i dettagli delle trap, ma non devono esporre segreti o dati grezzi
eccezioni del browser al codice ospite non attendibile.

## Formato manifesto

Ogni modulo generato ha un manifest ABI stabile compatibile con JSON insieme al suo file
Artefatto WASM e caricatore ESM digitato:

```json
{
  "format": "forge-web-script-module",
  "languageVersion": "1.0",
  "abiVersion": "1.2",
  "moduleName": "clocked",
  "exports": [{ "name": "current_time", "parameters": [], "result": "i64" }],
  "imports": [
    {
      "capability": "clock.now",
      "alias": "now",
      "function": { "name": "now", "parameters": [], "result": "i64" }
    }
  ],
  "requiredCapabilities": ["clock.now"],
  "memory": {
    "pageSize": 65536,
    "addressType": "u32",
    "ownership": "caller-owned",
    "stringEncoding": "utf8",
    "byteArrayRepresentation": "pointer-length",
    "allocatorExport": "fws_alloc",
    "deallocatorExport": "fws_dealloc",
    "reallocatorExport": "fws_realloc"
  },
  "valueRepresentations": { "i64": "i64", "string": "pointer-length-u32" },
  "trapModel": "explicit-trap"
}
```

Il manifest vero e proprio contiene tutte le voci di rappresentazione primitiva, non solo
quelli usati nell'esempio. Le chiavi JSON per esportazioni, importazioni e funzionalità sono
stabile attraverso build ripetute; le mappe di origine e gli hash dei contenuti vengono emessi da
l'adattatore del compilatore e non fanno parte della corrispondenza della firma ABI.

## Diagnostica

La diagnostica è record strutturati con `code`, `severity`, `phase`, `message`,
`fileName`e una fonte `span`; i record utilizzabili possono anche includere `hint`.
La fase è una delle `lex`, `parse`, `type-check`, O `abi`. Codice v1 stabile
le famiglie includono:

| Famiglia di codici | Significato |
| ------------- | ------------------------------------------------------------ |
| `FWS-LEX-*`   | caratteri non validi o stringhe senza terminazione |
| `FWS-PARSE-*` | sintassi di modulo, dichiarazione, istruzione o espressione non valida |
| `FWS-TYPE-*`  | tipo primitivo, nome, operatore, argomento o ritorno non valido |
| `FWS-ABI-*`   | nomi duplicati, funzionalità negate, esportazioni o importazioni |

Gli errori impediscono la generazione di artefatti. Gli avvisi e la diagnostica informativa lo fanno
non cambiare semantica. L'ordinamento diagnostico è l'ordine di origine, seguito dalla fase
ordine per la diagnostica allegata alla stessa campata. UN Vite l'adattatore deve preservare
il codice stabile e l'intervallo quando si inoltra un errore a Vite.

## Contratto di conformità Bootstrap

Il target del compilatore bootstrap è intenzionalmente più piccolo dell'eventuale
compilatore self-hosted. Un programma è nel sottoinsieme bootstrap se ne utilizza uno
modulo, le regole lessicali di cui sopra, i tipi primitivi, `string`/`bytes` valori,
funzioni esportate esplicitamente, importazioni di capacità, dichiarazioni locali, chiamate,
espressioni, `if`/`else`, E `return`. Non deve dipendere da un implicito
browser o Node globale.

`packages/forge-web-script/src/fixtures/bootstrap.ts` è l'eseguibile
corpus di conformità. Gli apparecchi accettati devono essere convalidati senza diagnostica di errori;
gli apparecchi scartati devono riportare i codici diagnostici elencati stabili e validi
intervalli di sorgente. Le implementazioni in altre lingue possono consumare lo stesso dispositivo
modellare e confrontare AST normalizzati, diagnostica e JSON manifest. L'apparecchio
suite è un obiettivo di conformità, non uno snapshot specifico dell'implementazione.

## Politica di compatibilità

Le versioni principali della lingua e dell'ABI sono incompatibili per impostazione predefinita. Un caricatore può accettare
lo stesso ABI maggiore con una versione minore superiore solo quando il produttore contrassegna il
nuovi campi facoltativi e il consumatore ignora i campi sconosciuti in modo sicuro. Rimozione di un
esportare, modificare un tipo, modificare la proprietà o modificare una funzionalità
la firma richiede una versione principale ABI. Aggiunta di una funzionalità mai silenziosamente
modifica un modulo esistente: richiede una nuova dichiarazione manifest e un nuovo host
approvazione.

Le versioni del compilatore non sono versioni ABI. I compilatori devono includere la loro versione in
l'input di compilazione e l'hash dell'artefatto, ma i caricatori confrontano il linguaggio e l'ABI
versioni più la firma del manifest. Un controllo di compatibilità non riuscito è a
diagnostica del tempo di caricamento, non un fallback di runtime. Moduli Rust e AssemblyScript
continuare a utilizzare i wrapper esistenti e i contratti ABI durante la coesistenza
periodo; Forge Web Script non li reinterpreta né li sostituisce.

## Roadmap dal bootstrap all'hosting autonomo

1. **Contratto Bootstrap:** mantieni il file TypeScript lexer, parser, controllo del tipo,
   generatore di manifest, dispositivi e diagnostica come conformità dell'eseguibile
   bersaglio. Aggiungere un emettitore WASM solo dopo programmi accettati e input non validi
   avere un comportamento stabile.
2. **Libreria standard Bootstrap:** implementa numeri interi/a virgola mobile deterministici
   operazioni, codec UTF-8 e byte, allocazione e propagazione delle trap senza
   API del browser. Testare ogni operazione attraverso l'ABI logica e host falsi.
3. **Sottoinsieme del compilatore Forge Web Script:** implementa il compilatore in Forge Web
   Script che utilizza solo il sottoinsieme accettato, record espliciti per lo stato del compilatore,
   buffer di byte/stringa e importazioni di capacità dichiarate. La sua uscita deve passare
   il TypeScript corpus di conformità byte per byte laddove deterministico.
4. **Espansione self-hosting:** aggiungi aggregati, loop, modelli di corrispondenza più ricchi,
   helper diagnostici e compilazione incrementale solo dopo che ciascuna funzionalità ha
   un dispositivo con versione e una storia ABI compatibile.

Il self-hosting è una pietra miliare successiva. Il compilatore bootstrap stabilisce la semantica
compatibilità; non è una promessa che la stessa v1 possa compilare una produzione
compilatore o che i carichi di lavoro Rust/AssemblyScript esistenti verranno riscritti.
