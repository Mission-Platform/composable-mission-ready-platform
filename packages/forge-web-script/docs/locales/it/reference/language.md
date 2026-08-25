# Forgia WebScript v1

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/forge-web-script/docs/reference/language.md: [packages/forge-web-script/docs/reference/language.md](../../../reference/language.md)
> Lingua: Italiano (it)

Forge Web Script (`.fws`) è un piccolo linguaggio generico per WebAssembly
carichi di lavoro. È incentrato sul web, basato sulle capacità e deliberatamente indipendente da esso
Vue, React, il DOM e il compilatore del componente Forge. Questo documento è il
contratto di linguaggio e modulo v1 autorevole. `@mission-platform/forge-web-script`
è la facciata di compatibilità sicura per browser per l'analisi, il controllo del tipo, grafici/collegamenti
risoluzione, dati manifest e API del servizio compilatore utilizzato dall'adattatore Vite
e LSP. `@mission-platform/forge-web-script-wasm` è il backend deterministico
che abbassa l'IR controllato a WebAssembly e WAT convalidati. Solo Node
Il pacchetto `@mission-platform/forge-web-script-cli` fornisce `forge-web-script`
comando per controllare e compilare file o grafici sorgente. Il file TypeScript
Il pacchetto contiene anche le apparecchiature di conformità eseguibili.

## Stato e versioni

Il contratto attuale è la **versione linguistica `1.0`** e la **versione logica ABI
`1.2`**. La versione linguistica descrive sorgente e semantica; la versione dell'ABI
descrive il limite WebAssembly e il protocollo host. Sono versione
in modo indipendente. Un compilatore deve scrivere entrambe le versioni in ogni modulo generato
manifest e un caricatore deve convalidarli entrambi prima dell'istanziazione. ABI `1.2` è un
revisione di rottura del contratto di memoria: i manifesti `memory` devono dichiarare
`allocatorExport: "fws_alloc"`, `deallocatorExport: "fws_dealloc"` e
`reallocatorExport: "fws_realloc"`, mentre `fws_reset` deve essere presente nel file
set di esportazione del modulo. I caricatori rifiutano manifest e moduli più vecchi o incompleti
piuttosto che assumere silenziosamente il riallocatore mancante.

Il formato di origine è testo UTF-8 con estensione `.fws`. Un file sorgente è un file
modulo definito da file; la sua identità deriva dall'ID file Vite normalizzato
(o percorso relativo allo spazio di lavoro). L'input del compilatore identifica la versione della lingua, mentre il file
manifest generato è l'indicatore di versione persistente utilizzato dai caricatori. Futuro
le revisioni possono aggiungere un pragma sorgente, ma la v1 non ne richiede uno; un compilatore v1
deve rifiutare un costrutto sorgente che non comprende piuttosto che indovinarlo
versione.

## Analisi delle fonti e politica di rilascio

Il pacchetto principale espone un contratto di analisi per il compilatore, il linguaggio
integrazioni di servizi, CLI e MCP. `analyzeForgeWebScript` accetta il segno di spunta
risultato del frontend e regole registrate opzionali, quindi restituisce fatti, risultati e
la stessa diagnostica stabile utilizzata dal resto del compilatore. Contesto di analisi
include file sorgente, voci opzionali della mappa sorgente, IR grezzi e ottimizzati, il
Manifesto ABI, metadati di grafico/collegamento, profilo di destinazione e policy normalizzata.

I risultati dell'analisi utilizzano codici `FWS-ANALYSIS-*` stabili e includono una categoria,
gravità, intervallo di origine compatibile con UTF-16, prove, suggerimento di correzione e
riferimenti OWASP/CWE opzionali. La loro diagnostica aggiunge `phase: "analysis"` e
metadati di sicurezza senza modificare `FWS-LEX-*`, `FWS-PARSE-*` esistenti,
Diagnostica `FWS-TYPE-*` o `FWS-ABI-*`.

Per impostazione predefinita, la compilazione utilizza il profilo rigoroso. In modalità rigorosa, gravità dell'errore
i risultati (o i risultati esplicitamente contrassegnati come `blocking`) impediscono l'output di Wasm e ESM;
il report completo rimane disponibile sull'artefatto restituito. Lo sviluppo
Il profilo è destinato ai flussi di lavoro dell'editor e dell'indagine: riporta i risultati
ma non li usa come cancello di rilascio. La policy include una funzionalità esplicita
lista consentita e limiti delimitati per risultati, profondità di chiamata, loop, allocazioni, asincrono
attività e input di espressioni regolari.

Le chiavi della cache del servizio del compilatore includono la politica di analisi normalizzata, registrata
identificatori di regole e input della mappa sorgente. Modificare uno qualsiasi di questi input di analisi
pertanto non è possibile riutilizzare un artefatto prodotto con una politica diversa.

## Risultati privi di eccezioni e flusso di controllo strutturato

Forge Web Script rappresenta risultati recuperabili con la libreria standard
Enumerazioni `Option<T>` e `Result<T, E>`. Utilizzare `match` per gestire ogni variante;
`throw`, `try` e `catch` a livello di origine non sono costrutti eseguibili. Il
i moduli strutturati `for`, `while` e `do while` sono flussi di controllo eseguibili v1;
non sono costrutti di eccezioni o iteratori. `Result` ha esattamente il
varianti `Ok(T)` e `Error(E)`.

Le funzioni dell'iteratore utilizzano `iter fn`, restituiscono `Iterator<T>` e sospendono in `yield`:

```fws
export iter fn forward(source: Iterator<i32>) -> Iterator<i32> {
  loop value = source.next() { yield value; }
}
```

Il compilatore espone un'esportazione dell'iteratore tramite un file compatibile con JavaScript
Adattatore `next()`. Ogni chiamata restituisce `{ value, done: false }` per un valore e
`{ value: undefined, done: true }` al completamento; rimangono le chiamate successive
completo. `Iterator<T>.next()` è digitato come `Option<T>`, quindi iteratori concatenati
deve preservare il tipo di elemento e il contratto di proprietà.

## Ottimizzazione e profili target

L'ottimizzazione del rilascio può applicare lo srotolamento comprovato dell'iteratore, l'inlining delle chiamate pure,
analisi delle chiamate in coda e pieghevole condizionale sicuro. Utilizzare la direttiva `noinline`
quando il confine di una funzione deve rimanere visibile. Importazioni e registrazione di capacità
sono effetti collaterali osservabili e non sono riordinati. Le funzionalità di destinazione sono attivabili
compilano l'input e vengono registrati nel manifest ABI e nella chiave cache:

```ts
const artifact = compileForgeWebScript({
  source,
  fileName: 'runtime.fws',
  compilerVersion: '1.0.0',
  optimization: 'release',
  targetFeatures: { simd: true, tailCall: true, memory64: true },
  compilerHints: { iteratorUnrollLimit: 4 },
});
```

`threads` e `atomics` devono essere entrambi abilitati per l'output atomico di memoria condivisa;
le combinazioni non supportate producono la diagnostica. Un manifest memory64 utilizza `u64`
indirizzi e valori puntatore-lunghezza-u64. In modalità debug, una cache configurata può
persistere deterministico `<key>.optimized.wat`, `<key>.unoptimized.wat`,
Artefatti `<key>.optimized.wasm` e `<key>.unoptimized.wasm`. La cache scrive
sono additivi e non disponibili o le cache in errore non falliscono la compilazione.

## Profili di collegamento tra progetti

FWS supporta due profili di collegamento primari per la gestione delle dipendenze tra progetti:

- `linkProfile: "static"`: i moduli tra progetti vengono riuniti in un unico modulo
  artefatto grafico dello scanner. Ciò consente un'ottimizzazione statica aggressiva
  (profilo `static-aggressive`) ed elimina la ricerca del modulo runtime nel file
  costo della dimensione dell'artefatto.
- `linkProfile: "dynamic"`: i limiti espliciti del modulo di origine vengono conservati.
  `ForgeWebScriptDynamicLinkCache` viene utilizzato per risolvere i moduli decoder in fase di esecuzione,
  con indirizzi di funzioni memorizzate nella cache codificati da artefatto e identità manifesta. Questo
  utilizza il profilo di ottimizzazione `dynamic-conservative`, che è più sicuro
  distribuzioni modulari.

## Riferimento lessicale

La grammatica canonica registrata è
[`src/grammar/forge-web-script.ebnf`](../../../../src/grammar/forge-web-script.ebnf).
I riepiloghi lessicali e parser riportati di seguito spiegano il contratto pubblico v1; il
L'artefatto EBNF è autorevole quando un dettaglio di implementazione è ambiguo.

Gli spazi bianchi sono insignificanti tranne che all'interno delle stringhe. `//` avvia un commento che
corre fino alla fine della riga. `/*` avvia un commento di blocco che termina con quello successivo
`*/`; i commenti dei blocchi possono estendersi su più righe. I commenti sono banali e non entrano nel file
grammatica. Gli identificatori iniziano con `A-Z`, `a-z` o `_` e
continuare con quei caratteri o cifre decimali. Gli identificatori sono
con distinzione tra maiuscole e minuscole. I valori letterali interi sono sequenze decimali non negative; v1 lo fa
non accettare la sintassi letterale esadecimale, ottale o in virgola mobile nel file
sottoinsieme bootstrap. Le stringhe utilizzano virgolette doppie e solo escape compatibili con JSON:
`\\`, `\"`, `\/`, `\b`, `\f`, `\n`, `\r`, `\t` e `\uXXXX` con esattamente
quattro cifre esadecimali. I terminatori di riga grezzi e gli escape non validi sono lessicali
errori; utilizzare invece `\n` o `\r`. I valori stringa sono valori UTF-8.

Le parole riservate sono `as`, `capability`, `case`, `catch`, `class`,
`constructor`, `default`, `do`, `else`, `enum`, `extends`, `export`, `for`,
`fn`, `if`, `impl`, `import`, `inline`, `interface`, `iter`, `let`, `likely`,
`loop`, `match`, `module`, `new`, `noinline`, `return`, `struct`, `switch`,
`throw`, `trait`, `try`, `unlikely`, `while` e `yield`. `true` e `false`
sono valori letterali booleani. La punteggiatura è
`{ } ( ) [ ] : ; , | .`; gli operatori lo sono
`! % * + - / < <= == != > >= && || = -> => ::`.

Ogni intervallo diagnostico è un intervallo di offset source semiaperto `[start, end)` nel file
stringa UTF-16 originale TypeScript (gli offset contano le unità di codice UTF-16), con
campi di riga e colonna a base unica. IL
L'implementazione bootstrap riporta insieme gli offset e i dati di riga/colonna, quindi a
L'adattatore Vite può produrre diagnostica con mappatura dell'origine senza analisi.

Lo scanner conserva i commenti come token `comment`, quindi i commenti sulla documentazione possono farlo
essere collegati alle funzioni, mentre le decisioni del parser saltano tutte le curiosità. Operatori
con prefissi condivisi vengono selezionati in base alla corrispondenza più lunga. Su input non valido il file
lo scanner consuma una regione delimitata, emette la diagnostica stabile `FWS-LEX-*` e
continua con un singolo token EOF; questo comportamento di recupero fa parte della grammatica
contratto. Il frontend TypeScript misura tutti gli offset in unità di codice UTF-16;
Le fasi di byte self-hosted devono convertire gli intervalli di byte UTF-8 prima di pubblicare il file
contratto di token condiviso.

### Commenti sulla documentazione delle funzioni

Un commento di blocco il cui delimitatore di apertura è `/**` è un commento di documentazione.
È allegato alla successiva dichiarazione `fn` o `export fn` di livello superiore solo quando
spazi bianchi e commenti ordinari si trovano tra il commento e la dichiarazione:

```fws
/**
 * Adds one to a value.
 *
 * @param value The value to increment.
 * @return The incremented value.
 * @deprecated Use `increment` in new code.
 */
export fn add(value: i32) -> i32 {
  return value + 1;
}
```

Commenti sulla documentazione prima delle importazioni di funzionalità, importazioni di sorgenti, strutture e
enumerazioni, interfacce o altre dichiarazioni non di funzione vengono scartate. Lo fanno
non portare avanti ad una funzione successiva. Se si verificano più commenti sulla documentazione
prima di una dichiarazione viene utilizzato il commento di documentazione più vicino (ultimo);
i commenti ordinari `//` e `/* ... */` non lo sostituiscono. La documentazione è
riconosciuto solo al livello più alto; i commenti all'interno dei corpi funzione non lo sono
metadati della funzione. Un commento di blocco senza terminazione produce il lessico stabile
la diagnostica `FWS-LEX-003` e il ripristino del parser rimangono disponibili per il resto
la fonte.

I metadati AST normalizzati hanno questa forma:

```ts
interface ForgeWebScriptDocumentation {
  readonly description: string;
  readonly tags: readonly ForgeWebScriptDocumentationTag[];
}

interface ForgeWebScriptDocumentationTag {
  readonly name: string;
  readonly subject?: string;
  readonly text: string;
}
```

Il normalizzatore rimuove i delimitatori `/**` e `*/`, gli spazi bianchi iniziali,
decorazione `*` iniziale opzionale su ciascuna riga e spazi bianchi circostanti. Corre
di spazi bianchi collassano in uno spazio. Righe descrittive prima del primo tag
sono raggruppati in paragrafi; le righe vuote rimangono interruzioni di paragrafo. Inizia un tag
su una riga che inizia con `@` e le righe successive non vuote continuano il
etichetta precedente. L'ordine dei tag e i tag duplicati vengono conservati.

I moduli di tag comunemente utilizzati sono:

| Modulo tag                                             | Campi strutturati                     |
| ------------------------------------------------------ | ------------------------------------- |
| `@param name text`, `@arg`, `@argument` o `@parameter` | `name` è `subject`; il resto è `text` |
| `@typeparam name text`                                 | `name` è `subject`; il resto è `text` |
| `@throws type text` o `@exception type text`           | `type` è `subject`; il resto è `text` |
| `@return text` o `@returns text`                       | Solo `text`                           |
| `@deprecated text`                                     | Solo `text`                           |

Altri moduli `@name` vengono accettati e conservati come tag ordinati anziché
segnalato come diagnostico. Non hanno alcun soggetto dedotto; il loro testo rimanente
è preservato. I nomi dei tag fanno distinzione tra maiuscole e minuscole.

Per i consumatori degli editor, gli stessi metadati vengono visualizzati in modo deterministico come file
descrizione seguita da ciascun tag nell'ordine di origine, con righe vuote in mezzo
parti. Viene inserito un oggetto tra il nome del tag e il suo testo, ad esempio:

```text
Adds one to a value.

@param value The value to increment.

@return The incremented value.

@deprecated Use `increment` in new code.
```

La documentazione è costituita da metadati di analisi, non da semantica del linguaggio eseguibile. Potrebbe
essere preservato nell’AST e nell’IR per i consumatori di servizi linguistici, ma non è così
influenzare l'analisi delle dichiarazioni, il controllo del tipo, l'abbassamento o il comportamento di runtime.
La documentazione è esclusa dalle firme e dai manifest ABI generati
dichiarazioni e artefatti del caricatore, Wasm/WAT, hash del contenuto eseguibile e
requisiti di capacità. Pertanto si modifica solo un commento sulla documentazione
non modificare l'ABI del modulo o il contratto eseguibile generato.

## Grammatica delle fonti

L'artefatto EBNF registrato collegato sopra descrive il lessicale completo,
bootstrap, aggregato esteso e contratto di ripristino. Il seguente estratto
descrive la superficie di bootstrap v1 per i lettori che non necessitano del file completo.
La grammatica utilizza `*` e `?` nel consueto senso EBNF:

```ebnf
module       = { import | function } ;
import       = "import", "capability", string, "as", identifier,
               "(", [ parameters ], ")", "->", type, ";" ;
sourceImport = "import", string, "as", identifier, ";" ;
function     = [ "export" ], "fn", identifier, "(", [ parameters ], ")",
               "->", type, block ;
parameters   = parameter, { ",", parameter } ;
parameter    = identifier, ":", type ;
block        = "{", { statement }, "}" ;
statement    = "let", identifier, ":", type, "=", expression, ";"
             | "return", [ expression ], ";"
             | "if", expression, block, [ "else", block ]
             | "while", expression, block
             | "for", "(", [ for-clause ], ";", expression, ";",
               [ for-clause ], ")", block
             | "do", block, "while", expression, ";"
             | identifier, "=", expression, ";"
             | expression, ";" ;
for-clause   = "let", identifier, ":", type, "=", expression
             | identifier, "=", expression
             | expression ;
type         = "bool" | "bytes" | "f32" | "f64" | "i32" | "i64"
             | "string" | "u32" | "u64" | "unit" ;
expression   = literal | identifier | call | unary | binary ;
call         = identifier, "(", [ expression, { ",", expression } ], ")" ;
unary        = ( "!" | "-" ), expression ;
literal      = integer | string | "true" | "false" ;
```

Gli operatori binari seguono questi livelli di precedenza, dal più forte al più debole:
`* / %`, `+ -`, confronti ordinati, uguaglianza, `&&` e `||`. Gli operatori lo sono
associativo di sinistra. Le espressioni tra parentesi sono riservate per il successivo bootstrap
revisione; un compilatore deve emettere una diagnostica di analisi anziché silenziosamente
accettandoli oggi.

Questo estratto è la grammatica **bootstrap**. Copre moduli definiti da file,
importazioni di capacità/sorgenti, firme primitive, chiamate, valori locali,
espressioni strutturate `if`/`else`, `while`, `for` in stile C, `do while` e
`return`. I moduli del ciclo fanno parte del contratto di bootstrap eseguibile; solo
le parole di eccezione riservate `throw`, `try` e `catch` vengono rifiutate come
costrutti eseguibili. Le dichiarazioni aggregate e i valori riportati di seguito sono i
Contratto **esteso** e non deve essere trattato come un'ortografia alternativa per
la grammatica del bootstrap.

### Grammatica aggregata estesa

Il contratto esteso aggiunge strutture immutabili, enumerazioni contrassegnate, tipi generici,
interfacce, valori di funzione, valori letterali di raccolta, indicizzazione e `match`.
Le loro forme di origine principali sono:

```ebnf
aggregate    = struct | enum | interface ;
struct       = "struct", identifier, [ generic_parameters ], "{",
               { identifier, ":", type, ";" }, "}" ;
enum         = [ "export" ], "enum", identifier, [ generic_parameters ], "{",
               variant, { ",", variant }, [ "," ], "}" ;
variant      = identifier, [ "(", [ parameters ], ")" ] ;
generic_parameters = "<", generic_parameter, { ",", generic_parameter }, ">" ;
generic_parameter  = identifier, [ ":", identifier ] ;
type         = primitive | identifier, [ "<", type, { ",", type }, ">" ]
             | "[", type, ";", integer, "]"
             | "Fn", "<", type, ",", type, ">" ;
constructor  = identifier, "::", identifier, "(", [ expression ], ")" ;
match        = "match", expression, "{", match_arm, { ",", match_arm }, "}" ;
match_arm    = pattern, "=>", expression ;
pattern      = "_" | identifier, [ "(", [ identifier, { ",", identifier } ], ")" ] ;
```

Costruttori qualificati come `Result::Ok(value)` e
`Result::Error(message)` si risolve rispetto alla variante aggregata e convalida
arità e tipi di campo. Le varianti standard `Result<T, E>` sono esattamente
`Ok(T)` e `Error(E)`; `Option<T>` rimane `Some(T)` e `None`. Una funzione
value utilizza `fn name` e un tipo `Fn<parameter, result>` dichiarato, ad esempio
`let callback: Fn<i32, i32> = fn increment;`. I valori delle funzioni vengono controllati da
la firma della funzione di riferimento e sono richiamabili solo con arity corrispondente
e tipi di argomento.

I collegamenti di corrispondenza sono locali rispetto al braccio: collegamenti `Result::Ok(item) => item`
`item` controllando solo quell'espressione. I nomi di associazione devono essere univoci in un file
arm e il loro conteggio devono corrispondere ai campi della variante selezionata; non perdono
alle braccia dei fratelli o alla funzione circostante.

## Tipi e semantica

V1 ha i tipi primitivi `bool`, con segno `i32`/`i64`, senza segno `u32`/`u64`,
`f32`/`f64`, `string`, `bytes` e `unit`. Non ci sono valori numerici impliciti
conversioni. Gli operandi aritmetici devono avere lo stesso tipo numerico; confronti
produrre `bool`; gli operatori logici richiedono `bool`; l’uguaglianza richiede uguale
tipi. Una funzione ha un tipo di risultato dichiarato e restituisce una funzione `unit`
senza un valore.

### Espressioni regolari di proprietà del compilatore

Forge Web Script fornisce una libreria standard deterministica di espressioni regolari.
Le chiamate `regex_full_match(pattern, value) -> bool`,
`regex_prefix_match(pattern, value) -> bool` e
`regex_search(pattern, value, start: i32) -> bool` esegue valori interi,
rispettivamente il prefisso posizione zero e la corrispondenza della ricerca più a sinistra. Cattura i limiti
sono disponibili tramite il corrispondente `regex_*_capture_start` e
`regex_*_capture_end` chiamate; prendono un indice di gruppo e restituiscono una stringa UTF-16
offset o `-1` quando non c'è corrispondenza o il gruppo non è impostato. Cerca cattura
le chiamate inoltre assumono l'offset iniziale prima dell'indice del gruppo.

Le chiamate regex sono funzioni della libreria standard di proprietà del compilatore. Sono digitati da
il frontend, annotato in IR, e non sono mai importazioni di capacità. Un modulo che utilizza
solo le chiamate regex hanno quindi un array `imports` vuoto e un array vuoto
matrice `requiredCapabilities`. L'abbassamento del backend e la VM nel modulo sono a
fase di attuazione separata; un compilatore non deve sostituire queste chiamate con a
browser `RegExp`, API Node o importazione host implicita.

La sintassi supportata è intenzionalmente limitata ai caratteri letterali `.`
classi e intervalli (inclusa la negazione di `^`), `\d`, `\D`, `\w`, `\W`, `\s`,
`\S`, valori letterali con escape, gruppi catturanti e non catturanti, alternanza,
`*`, `+`, `?`, `{n}` limitato, `{n,}`, `{n,m}` quantificatori, quantificatori pigri,
e ancoraggi `^`/`Forge Web Script fornisce una libreria standard deterministica di espressioni regolari.
Le chiamate`regex_full_match(pattern, value) -> bool`,
`regex_prefix_match(pattern, value) -> bool`e`regex_search(pattern, value, start: i32) -> bool`esegue valori interi,
rispettivamente il prefisso posizione zero e la corrispondenza della ricerca più a sinistra. Cattura i limiti
sono disponibili tramite il corrispondente`regex__*capture_start`e`regex*__capture_end`chiamate; prendono un indice di gruppo e restituiscono una stringa UTF-16
offset o`-1` quando non c'è corrispondenza o il gruppo non è impostato. Cerca cattura
le chiamate inoltre assumono l'offset iniziale prima dell'indice del gruppo.

Le chiamate regex sono funzioni della libreria standard di proprietà del compilatore. Sono digitati da
il frontend, annotato in IR, e non sono mai importazioni di capacità. Un modulo che utilizza
solo le chiamate regex hanno quindi un array `imports` vuoto e un array vuoto
matrice `requiredCapabilities`. L'abbassamento del backend e la VM nel modulo sono a
fase di attuazione separata; un compilatore non deve sostituire queste chiamate con a
browser `RegExp`, API Node o importazione host implicita.

La sintassi supportata è intenzionalmente limitata ai caratteri letterali `.`
classi e intervalli (inclusa la negazione di `^`), `\d`, `\D`, `\w`, `\W`, `\s`,
`\S`, valori letterali con escape, gruppi catturanti e non catturanti, alternanza,
`*`, `+`, `?`, `{n}` limitato, `{n,}`, `{n,m}` quantificatori, quantificatori pigri,
e ancoraggi `^`/. Riferimenti all'indietro, lookaround, gruppi denominati, flag e
altre estensioni del motore host vengono rifiutate. La sintassi non supportata ha stable
`FWS-REGEX-001` diagnostica; i modelli non validi utilizzano `FWS-REGEX-002` e un
L'errore invariante del compilatore interno utilizza `FWS-REGEX-003`.

Il pacchetto condiviso `@mission-platform/forge-web-script-regex` possiede la scuderia `$`
bytecode (`FORGE_REGEX_BYTECODE_VERSION`) e compilatore in fase di compilazione. È esplicito
Il punto di ingresso `/reference` espone una VM TypeScript solo come oracolo di conformità
per test differenziali su motore nativo e backend; la radice del pacchetto no
esporre quella VM. I metadati specifici del telefono rimangono nel pacchetto dei numeri di telefono.
L'esecuzione di regex di produzione appartiene al backend Forge Web Script e al file
modulo WASM generato, mai a un livello di runtime TypeScript o a una funzionalità host.

`string` e `bytes` sono i valori aggregati v1. Una stringa è immutabile
sequenza di valori scalari Unicode rappresentati come UTF-8 al confine ABI.
I byte sono una sequenza immutabile di ottetti e possono contenere qualsiasi valore da
Da `0x00` a `0xff`. Le loro operazioni a livello di sorgente sono intenzionalmente piccole
nel sottoinsieme bootstrap; forniscono le chiamate host e i moduli successivi della libreria standard
operazioni di codifica, suddivisione e raccolta senza aggiungere il browser ambientale
API per la lingua.

### Firme della raccolta

Il contratto di estensione della raccolta è strutturale e basato sul ricevitore; lo fa
non aggiungere metodi oggetto arbitrari. Gli array fissi vengono scritti `[T; N]` e
vettori come `Vector<T>`. Le firme supportate sono:

| Ricevitore  | Metodo         | Firma                   |
| ----------- | -------------- | ----------------------- |
| `Array<T>`  | `length`       | `() -> u32`             |
| `Array<T>`  | `get`          | `(u32) -> Option<T>`    |
| `Array<T>`  | `set`          | `(u32, T) -> Array<T>`  |
| `Array<T>`  | `iter`         | `() -> Iterator<T>`     |
| `Vector<T>` | `length`       | `() -> u32`             |
| `Vector<T>` | `get`          | `(u32) -> Option<T>`    |
| `Vector<T>` | `set`          | `(u32, T) -> Vector<T>` |
| `Vector<T>` | `push` o `add` | `(T) -> Vector<T>`      |
| `Vector<T>` | `pop`          | `() -> Option<T>`       |
| `Vector<T>` | `iter`         | `() -> Iterator<T>`     |

L'ortografia `add` è intenzionalmente un alias di compatibilità per il vettore
`push`; non è un metodo di array. Gli indici sono `u32`, gli argomenti degli elementi devono
corrispondere a `T` e i valori restituiti devono corrispondere alle firme sopra. Arità sbagliata,
tipi di argomenti, tipi di ricevitori e metodi sconosciuti sono errori di controllo del tipo.
I valori letterali vuoti richiedono il tipo di elemento contestuale, mentre l'array/vettore non vuoto
i letterali deducono ricorsivamente il loro tipo di elemento e rifiutano elementi misti. A
il valore letterale dell'array fisso deve contenere esattamente gli elementi `N`.

Le localizzazioni hanno un ambito di funzione, vengono inizializzate esattamente una volta e non possono essere lette prima
la loro dichiarazione. Una dichiarazione locale non nasconde alcun nome esistente: duplicato
i nomi sono un errore. Le funzioni e gli alias di capacità condividono uno spazio dei nomi del modulo
e deve essere unico. Una chiamata deve nominare una funzione dichiarata o importata
capacità e i relativi tipi di arità e argomento devono corrispondere esattamente.

La superficie del flusso di controllo v1 è strutturata `if`/`else`, `while`, `for` in stile C,
`do while` e il primo `return`. Le clausole `for` sono dichiarazioni esplicite e lo fanno
non introdurre classi, ricevitori o mutazioni implicite al di fuori del ciclo
ambiente di valore locale. Non esiste un risultato fall-through implicito: ogni
il percorso raggiungibile in una funzione non `unit` deve restituire il tipo dichiarato. Il
il controllo bootstrap segnala gli errori del tipo restituito; l'analisi della raggiungibilità è a
è richiesto il follow-up prima di dichiarare un compilatore completamente conforme a v1.

FWS è intenzionalmente privo di classi. `class`, `constructor`, `extends`, `impl`,
`new` e `trait` sono riservati e rifiutati con diagnostica stabile
`FWS-PARSE-052`; strutture immutabili, enumerazioni con tag, interfacce e funzioni
i valori sono le alternative orientate al valore supportate. Il self-hosting organizzato
Il contratto mantiene il compilatore TypeScript archiviato come seed mentre il compilatore FWS
e i contratti di runtime vengono avviati in modo incrementale.

## Moduli definiti da file, importazioni di origine ed esportazioni

Non esiste alcuna dichiarazione `module` nidificata. Ogni file `.fws` è un modulo e il suo
il nome stabile deriva dal suo ID file normalizzato. Ad esempio,
`src/time.fws` nel progetto `/workspace/app` ha l'ID modulo `src/time`. Nidificato
La sintassi `module name { ... }` viene rifiutata con una diagnostica di migrazione.

Le importazioni dei moduli di origine sono distinte dalle importazioni delle funzionalità host:

```fws
import "./math.fws" as math;
import capability "clock.now" as now() -> i64;
```

L'adattatore Vite risolve le importazioni di origine tramite il grafico del modulo. Dipendenze
all'interno di un progetto sono collegati staticamente per impostazione predefinita. Impostazione predefinita dei bordi tra progetti
al caricamento dinamico e può essere configurato come `static` o `dynamic` con esplicito
configurazione del collegamento root del progetto. Moduli mancanti, cicli non supportati da
la modalità di collegamento selezionata e le collisioni di identità sono la diagnostica del grafico.

I collegamenti statici appiattiscono le esportazioni guest raggiungibili in un unico artefatto. Esporta collisioni
vengono rifiutati in modo deterministico (`FWS-LINK-003` per firme duplicate e
`FWS-LINK-004` per firme incompatibili); il linker non lo fa silenziosamente
spazio dei nomi o sovrascrivere le funzioni guest. I collegamenti dinamici rimangono un modulo separato
confini e vengono registrati come importazioni del modulo sorgente nel manifest ABI, mai
come funzionalità dell'host ambientale.

Sono pubbliche solo le dichiarazioni precedute da `export`. I nomi delle esportazioni sono stabili,
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
`clock.now`, `random.bytes` o `storage.read`. I nomi delle funzionalità sono di proprietà di
la piattaforma e ogni nome ha una firma con versione separata. oggetti DOM,
`window`, `document`, Node integrati, client di rete e altri browser globali
non sono mai dipendenze guest ambientali.

Il caricatore esegue questi controlli prima dell'istanziazione:

1. Sono supportati il formato manifest, la versione della lingua e la versione ABI.
2. Tutte le funzionalità richieste sono presenti nel registro host.
3. Ogni funzionalità fornita ha la firma esatta dichiarata e nessuna non dichiarata
   l'importazione degli ospiti è accettata.
4. Le dichiarazioni di memoria, allocatore, esportazione e importazione sono interne
   coerente.

L'individuazione delle capacità è un'operazione host esplicita. Un host può esporre a
inventario delle capacità nel codice dell'applicazione, ma l'ospite riceve solo il file
importazioni dichiarate dal suo modulo. Le funzionalità mancanti o negate falliscono con a
trap `CapabilityDenied` in fase di caricamento; non diventano `undefined` o a
silenzioso no-op.

## Valori, memoria lineare e proprietà

Il modulo utilizza una memoria lineare WebAssembly con pagine da 64 KiB e little-endian
valori scalari. I valori scalari vengono mappati come segue:

| Forgia script Web | Rappresentazione WebAssembly                         |
| ----------------- | ---------------------------------------------------- |
| `bool`            | `i32`, dove `0` è falso e `1` è vero                 |
| `i32`, `u32`      | `i32`                                                |
| `i64`, `u64`      | `i64`                                                |
| `f32`, `f64`      | corrispondente WebAssembly float                     |
| `unit`            | nessun valore risultato                              |
| `string`, `bytes` | due valori `u32`: puntatore quindi lunghezza in byte |

Il manifest dichiara la stessa mappatura in `valueRepresentations`. A
La coppia puntatore-lunghezza viene sempre controllata come intervallo senza segno prima di leggere o
scrivendo: `pointer <= memory.byteLength` e `length <= byteLength - pointer`.
La lunghezza zero è valida e può utilizzare qualsiasi puntatore in-bounds, inclusa la fine di
memoria. Un controllo non riuscito intercetta `MemoryOutOfBounds` e non espone mai a
valore parzialmente decodificato.

Il modulo generato esporta `fws_alloc(size: u32) -> u32`,
`fws_dealloc(pointer: u32, size: u32) -> unit` e
`fws_realloc(pointer: u32, oldSize: u32, newSize: u32) -> u32` come proprietà
confine per i buffer. In abbreviazione di firma, l'operazione è
`fws_realloc(pointer, oldSize, newSize) -> pointer`. Il chiamante che alloca un buffer ne è il proprietario e deve farlo
deallocarlo o riallocarlo utilizzando lo stesso modulo e la sua esatta dimensione attuale.
Il riallocatore preferisce ridimensionare l’attuale allocazione per l’acqua alta in vigore,
compreso il restringimento e la crescita quando la memoria lineare può crescere. Altrimenti
alloca una sostituzione, copia esattamente `min(oldSize, newSize)` byte e
rilascia la vecchia allocazione prima di restituire il puntatore di sostituzione. A
il risultato di dimensione zero è valido e una richiesta di dimensione uguale restituisce l'originale
puntatore. Le implementazioni dell'host devono copiare i byte di input prima della chiamata guest
restituisce a meno che il manifest non introduca esplicitamente un futuro buffer preso in prestito
contrarre. Il codice ospite non deve conservare un puntatore di proprietà dell'host dopo una chiamata dell'host.
Trappole di errore di allocazione o crescita con `MemoryExhausted`; un puntatore non valido o
trappole con intervallo dimensionale con `MemoryOutOfBounds`; e un puntatore obsoleto, errato
`oldSize`, trap gratuite doppie o non valide con `InvalidOwnership`. Questi
i controlli avvengono prima della mutazione e una riallocazione fallita lascia l'originale
allocazione e byte invariati.

Le eccezioni host vengono convertite in `HostError` con il nome della funzionalità e un file
codice di errore host opaco. Le trappole per gli ospiti non vengono mai convertite in restituzione ordinaria
valori. Gli host possono registrare i dettagli dei trap, ma non devono esporre segreti o dati grezzi
eccezioni del browser al codice ospite non attendibile.

### Operazioni di memoria controllate di proprietà dell'ospite

I moduli di origine FWS che implementano un heap guest con stato possono utilizzare il file di proprietà del compilatore
operazioni `memory_alloc(size: u32) -> u32`,
`memory_dealloc(pointer: u32, size: u32) -> unit`,
`memory_realloc(pointer: u32, oldSize: u32, newSize: u32) -> u32`,
`memory_load_u32(address: u32) -> u32` e
`memory_store_u32(address: u32, value: u32) -> unit`. Queste operazioni sono
abbassato direttamente nell'allocatore del modulo o nella memoria WebAssembly controllata
istruzioni; non sono importazioni da host e non espongono lo Stato ospite a
TypeScript.

L'allocatore utilizza lo stesso contratto di proprietà e trap di `fws_alloc` e
`fws_realloc`. Un caricamento o un archivio richiede un intervallo completo di quattro byte all'interno di
memoria lineare attuale; un intervallo non valido si intercetta con `MemoryOutOfBounds` prima
l'operazione può essere parzialmente eseguita. `memory_realloc` conserva il primo
`min(oldSize, newSize)` byte e restituisce un puntatore di proprietà dell'ospite, mentre i chiamanti
deve utilizzare il puntatore restituito e la sua esatta dimensione corrente per le operazioni successive.
L'attrezzatura per la memoria con stato qui sotto
`packages/forge-web-script/src/fixtures/stateful-memory.fws` è la conformità
dispositivo per queste firme, riutilizzo dell'allocatore, ricorsione, ripristino e limiti
trappole.

I lettori di byte di proprietà del compilatore forniscono anche varianti di indice senza segno per guest
front-end che rappresentano gli offset di origine come handle: `bytes_length_u32(value:
byte) -> u32` and `bytes_byte_at_u32(valore: byte, indice: u32) -> u32`. Loro
utilizzare gli stessi controlli dei limiti della lunghezza del puntatore del `bytes_length` firmato e
`bytes_byte_at` operazioni e non sono importazioni host. Il front-end WebLua utilizza
queste operazioni per mantenere gli offset del lexer e gli indirizzi della memoria guest in uno
dominio `u32` controllato.

### ABI WASM grezzo e contratto ESM generato

La rappresentazione sopra è il WASM ABI grezzo stabile. È intenzionalmente
di basso livello e non cambia quando la facciata JavaScript generata diventa maggiore
ergonomico:

```text
raw string value: (pointer: u32, length: u32)
raw bytes value:  (pointer: u32, length: u32)
```

L'artefatto ESM generato dal compilatore proietta l'ABI in un'API JavaScript:

```ts
type ForgeWebScriptBytes = readonly [pointer: number, length: number];

interface ForgeWebScriptExports {
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: (size: number) => number;
  readonly fws_dealloc: (pointer: number, size: number) => void;
  readonly fws_realloc: (pointer: number, oldSize: number, newSize: number) => number;
  readonly fws_reset: () => void;
  readonly echo: (value: string) => string;
  readonly processBytes: (value: ForgeWebScriptBytes) => ForgeWebScriptBytes;
}
```

Ogni dichiarazione generata, comprese le importazioni di capacità e i collegamenti dinamici
esportazioni, utilizza `string` per i valori FWS `string`. Il `load` generato e
I wrapper `loadSync` codificano le stringhe JavaScript come UTF-8, passano la lunghezza del puntatore
si accoppia all'ABI WASM invariato e decodifica le stringhe restituite in JavaScript
corde. La decodifica utilizza un decoder UTF-8 irreversibile: i byte guest malformati sono un
errore di confine esplicito anziché caratteri sostitutivi.

Gli argomenti stringa per una chiamata vengono prima codificati e raggruppati in uno contiguo
assegnazione degli ospiti. Ciò mantiene invariato l'ABI grezzo evitando un ospite
allocazione e copia da JavaScript a WASM per argomento. Restano validi gli argomenti scalari
il loro percorso veloce e diretto. `bytes` non viene deliberatamente convertito in `Uint8Array`:
i chiamanti continuano a passare e ricevere `ForgeWebScriptBytes` e `memory` è
esposto in modo che i chiamanti possano leggere o scrivere intervalli di byte non elaborati utilizzando la memoria del modulo
e regole di proprietà.

L'adattatore generato possiede buffer temporanei creati per argomenti stringa e
risultati di stringa. Decodifica un risultato prima di rilasciarlo, quindi rilascia ciascuno di essi
intervallo temporaneo esattamente una volta in un percorso `finally` in caso di successo, trappole ospite, host
eccezioni ed errori di decodifica. Riceve una funzionalità host con valori stringa
Stringhe JavaScript e possono restituire una stringa JavaScript; il wrapper esegue il
allocazione guest e copia UTF-8 per quel valore restituito. Il codice host deve ancora essere copiato
input `bytes` non elaborati prima di restituire, a meno che un manifest futuro non lo dichiari esplicitamente
un contratto di buffer in prestito. `load` e `loadSync` espongono lo stesso generato
contratto; differiscono solo nella pianificazione dell'inizializzazione del modulo.

La modifica di questa proiezione JavaScript non modifica `valueRepresentations`, the
ABI con la lunghezza del puntatore non elaborato, la versione ABI o l'hash del contenuto WASM non elaborato.
L'artefatto generato mantiene una rappresentazione WASM incorporata decodificata pigramente;
`load` e `loadSync` lo condividono anziché materializzare un carico utile separato
copie. Di conseguenza, i controlli del caricatore asincrono rispetto a quello sincronizzato dovrebbero confrontare il comportamento
e dichiarazioni, mentre i controlli deterministici dell'hash del contenuto dovrebbero eseguire l'hashing del raw
Byte WASM indipendentemente dalla dimensione della sorgente ESM generata o dall'implementazione del caricatore
dettagli.

## Formato manifesto

Ogni modulo generato ha un manifest ABI stabile compatibile con JSON insieme al suo file
Artefatto WASM e caricatore ESM digitato:

```json
{
  "format": "forge-web-script-module",
  "languageVersion": "1.0",
  "abiVersion": "1.2",
  "moduleName": "src/clocked",
  "exports": [{ "name": "current_time", "parameters": [], "result": "i64" }],
  "imports": [
    {
      "capability": "clock.now",
      "alias": "now",
      "function": { "name": "now", "parameters": [], "result": "i64" }
    }
  ],
  "sourceImports": [],
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
  "trapModel": "explicit-trap",
  "standardLibrary": { "regexBytecodeVersion": "bytecode-1" }
}
```

Il manifest vero e proprio contiene tutte le voci di rappresentazione primitiva, non solo
quelli usati nell'esempio. Le chiavi JSON per esportazioni, importazioni e funzionalità sono
stabile attraverso build ripetute; le mappe di origine e gli hash dei contenuti vengono emessi da
l'adattatore del compilatore e non fanno parte della corrispondenza della firma ABI.

Il campo manifest `standardLibrary` registra le identità della libreria di proprietà del compilatore.
Per le espressioni regolari, `regexBytecodeVersion` e un `regexCorpusHash` opzionale sono cache
e input di artefatti. Il sorgente normalizzato, versione del compilatore, ottimizzazione
modalità, grafico del modulo, configurazione del collegamento, identità della libreria standard e metadati
L'hash del corpus deve essere serializzato in un ordine stabile prima della ricerca nella cache. Identico
gli input producono tabelle di bytecode, manifesti, dichiarazioni, WAT e file identici
hash dei contenuti; la modifica di qualsiasi input di identità è un errore nella cache. Un hash del corpus lo è
di proprietà del pacchetto che fornisce il corpus e non deve essere dedotto dall'host
stato di esecuzione.

## Confini del compilatore e della CLI

La facciata pubblica TypeScript mantiene separati i contratti frontend e l'orchestrazione
dall'emissione. Accetta un file sorgente o un grafico risolto, produce strutturato
diagnostica più IR digitato e delega la generazione di WebAssembly/WAT a
`@mission-platform/forge-web-script-wasm`. Il backend convalida prima i suoi byte
restituirli; gli errori sopprimono l'output eseguibile. L'adattatore Vite e l'uso di LSP
la facciata e non è necessario che dipendano dalla CLI Node.

Per i flussi di lavoro del file system, installare `@mission-platform/forge-web-script-cli` e
usa il suo binario `forge-web-script` autonomo:

```text
forge-web-script check <entry.fws> [--root <directory>] [--project-root <directory>]
forge-web-script compile <entry.fws> --out-dir <directory>
  [--root <directory>] [--project-root <directory>]
  [--link-mode static|dynamic] [--capability <name>] [--optimization debug|release]
```

`check` convalida gli input di origine e grafico senza scrivere file. Un successo
`compile` scrive esattamente `<entry>.wasm`, `<entry>.wat`, `<entry>.abi.json`,
`<entry>.d.ts`, `<entry>.js` e `<entry>.map` nella directory di output selezionata.
La CLI mette in scena e rinomina il set completo solo dopo che la diagnostica è stata chiarita, quindi
origine non valida, bordi del grafico non risolti, funzionalità negate ed errori ABI
non lascia alcun artefatto eseguibile e restituisce uno stato diverso da zero. Ordinamento dell'output,
manifest JSON, WAT, dichiarazioni, dati del caricatore, mappe di origine e hash dei contenuti
sono deterministici per input identici.

## Integrazione dei test Vitest e Vite

Utilizzare `@mission-platform/forge-web-script-vitest` quando è necessario una suite Vitest
affermare artefatti del compilatore, diagnostica strutturata, comportamento Wasm, collegamenti grafici,
o il contratto del modulo Vite generato. I suoi metodi di cablaggio diretto (`compile`,
`compileSource`, `compileGraph`, `inspect`, `load`, `loadSync` e
`checkVmParity`) delegare al pubblico i contratti compilatore/runtime; suo
L'helper `defineForgeWebScriptVitestConfig` installa la produzione
`forgeWebScriptPlugin` preservando i plugin e le impostazioni Vite consumer.
Vedere [Test in Mission Platform](../../../../../../docs/locales/it/testing.md#forge-web-script-tests) per
esempi di configurazione ed attrezzatura.

Il cablaggio accetta le funzioni host solo tramite mappe di capacità esplicite codificate
in base ai nomi delle funzionalità manifest, ad esempio:

```ts
const exports = await harness.load<{ current: () => bigint }>('capabilities/clock-now.fws', {
  'clock.now': { now: () => 123n },
});
```

Le importazioni dichiarate mancanti e le importazioni fornite non dichiarate rappresentano un fallimento. Prova
i progetti che importano `.fws` o le relative query sugli artefatti virtuali dovrebbero aggiungere il file
sottopercorso della dichiarazione di solo tipo
`@mission-platform/forge-web-script-vitest/forge-web-script` al loro
TypeScript Elenco `types` o un punto di ingresso del tipo di test a cui si fa riferimento.

I dispositivi di cablaggio condivisi di seguito
`packages/forge-web-script-vitest/fixtures/` sono il corpus di pacchetti incrociati per
moduli validi, diagnostica, funzionalità, grafici e parità self-hosted.
Le soluzioni locali del pacchetto rimangono appropriate per compilatore, runtime e plugin
test che esercitano dettagli privati.

`checkVmParity` segnala il contratto di parità lex-stage self-hosted limitato in
Modalità `interpret`, `jit` o `aot`. Dichiarare parità, impronte digitali, conteggio dei passi,
e metadati di riproducibilità AOT, ma non considerare questo rapporto come arbitrario
esecuzione della VM FWS compilata; Il caricamento di Wasm rimane il controllo del comportamento in fase di esecuzione.

## Diagnostica

La diagnostica è un record strutturato con `code`, `severity`, `phase`, `message`,
`fileName` e una sorgente `span`; i record utilizzabili possono includere anche `hint`.
La fase è una tra `lex`, `parse`, `type-check` o `abi`. Codice v1 stabile
le famiglie includono:

| Famiglia di codici | Significato                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `FWS-LEX-*`        | caratteri/escape non validi, terminatori di riga di stringhe non elaborate o stringhe/commenti senza terminazione |
| `FWS-PARSE-*`      | sintassi di modulo, dichiarazione, istruzione o espressione non valida                                            |
| `FWS-TYPE-*`       | tipo primitivo, nome, operatore, argomento o ritorno non valido                                                   |
| `FWS-ABI-*`        | nomi duplicati, funzionalità negate, esportazioni o importazioni                                                  |
| `FWS-REGEX-*`      | modelli regex di proprietà del compilatore non supportati o non validi                                            |

Gli errori impediscono la generazione di artefatti. Gli avvisi e la diagnostica informativa lo fanno
non cambiare semantica. L'ordinamento diagnostico è l'ordine di origine, seguito dalla fase
ordine per la diagnostica allegata alla stessa campata. È necessario preservare un adattatore Vite
il codice stabile e l'intervallo quando si inoltra un errore a Vite.

## Contratto di conformità Bootstrap

La destinazione del compilatore v1 è intenzionalmente limitata al linguaggio e alla superficie ABI
documentato qui. Un programma è nel sottoinsieme bootstrap se ne utilizza uno
modulo, le regole lessicali di cui sopra, i tipi primitivi, i valori `string`/`bytes`,
funzioni esportate esplicitamente, importazioni di capacità, dichiarazioni locali, chiamate,
espressioni, `if`/`else`, `while`, `for` stile C, `do while` e `return`.
Il contratto aggregato esteso viene sottoposto a test di conformità separatamente e aggiunge
strutture, enumerazioni, tipi generici, valori di raccolta, valori di funzione e
`match`; non deve dipendere da un browser implicito o da Node globale.

`packages/forge-web-script/src/fixtures/bootstrap.ts` è l'eseguibile
corpus di conformità. Gli apparecchi accettati devono essere convalidati senza diagnostica di errori;
gli apparecchi scartati devono riportare i codici diagnostici elencati stabili e validi
intervalli di sorgente. Le implementazioni in altre lingue possono consumare lo stesso dispositivo
modellare e confrontare AST normalizzati, diagnostica e JSON manifest. L'apparecchio
suite è un obiettivo di conformità, non uno snapshot specifico dell'implementazione.

Il corpus delle fonti condivise in
`packages/forge-web-script-vitest/fixtures` copre lo stesso limite:
`valid/collections.fws` esercita valori letterali di raccolta, indicizzazione, contestuali
vettori vuoti, `length()` e stringhe con escape valide;
`valid/aggregates.fws` esercita i valori della funzione, `Result::Ok` qualificato e
Costruttori `Result::Error` e associazioni di corrispondenza arm-locale; e
`diagnostics/collections.fws` esercita chiamate di raccolta e aggregazione non valide
diagnostica del costruttore/associazione. Viene compilato anche il calendario della raccolta
attraverso l'imbracatura condivisa Wasm; la sintassi aggregata viene mantenuta come frontend
origine di conformità finché non viene abilitato l'abbassamento complessivo del Wasm per quel cablaggio.

## Politica di compatibilità

Le versioni principali della lingua e dell'ABI sono incompatibili per impostazione predefinita. Un caricatore può accettare
lo stesso ABI maggiore con una versione minore superiore solo quando il produttore contrassegna il
nuovi campi facoltativi e il consumatore ignora i campi sconosciuti in modo sicuro. Rimozione di un
esportare, modificare un tipo, modificare la proprietà o modificare una funzionalità
la firma richiede una revisione ABI importante e deve essere rifiutata dai caricatori che
non implementarlo. ABI `1.2` è una revisione così importante nonostante il mantenimento
la numerazione `1.x`: l'esportazione della memoria `fws_realloc` richiesta non è opzionale,
e i manifesti ABI `1.1` non vengono aggiornati automaticamente. Aggiungere una funzionalità mai
modifica silenziosamente un modulo esistente: richiede una nuova dichiarazione manifest e
approvazione dell'ospite.

Le versioni del compilatore non sono versioni ABI. I compilatori devono includere la loro versione in
l'input di compilazione e l'hash dell'artefatto, ma i caricatori confrontano il linguaggio e l'ABI
versioni più la firma del manifest. Un controllo di compatibilità non riuscito è a
diagnostica del tempo di caricamento, non un fallback di runtime. Moduli Rust e AssemblyScript
continuare a utilizzare i wrapper esistenti e i contratti ABI durante la coesistenza
periodo; Forge Web Script non li reinterpreta né li sostituisce.

La compatibilità della libreria standard di regex è intenzionalmente separata dalla regex dell'host
compatibilità. Il contratto e il compilatore del bytecode Forge definiscono l'accettato
sintassi e diagnostica stabile; la VM di riferimento viene utilizzata solo per convalidare il file
comportamento più a sinistra/backtracking, offset di acquisizione UTF-16 e sentinella non impostata `-1`
finché la VM backend non sarà disponibile. Comportamento del browser o dell'espressione regolare Node
è solo un oracolo differenziale e né la VM di riferimento TypeScript né a
L'API di espressioni regolari host può eseguire una chiamata alla libreria standard di produzione.
Modifica della numerazione del codice operativo, layout dello slot di acquisizione, sintassi supportata, diagnostica
codici o la semantica corrispondente richiede una nuova versione del bytecode regex e una nuova
identità dell'artefatto. Fino alla conformità backend/runtime e alla migrazione del numero di telefono
le prove sono complete, l'implementazione del telefono AssemblyScript rimane un
oracolo di regressione legacy esplicito e non viene mai mescolato con un artefatto della Forgia.

## Convivenza e migrazione

Forge Web Script è l'obiettivo di produzione per il neutrale
Artefatto `@mission-platform/code-scanner`. Il grafico dello scanner si collega staticamente
le origini del decodificatore QR, matrice e codice a barre in un WebAssembly autonomo
artefatto; il profilo dinamico mantiene espliciti i limiti del modulo sorgente e
memorizza nella cache le esportazioni risolte. La cassa Rust `code-scan` rimane disponibile come
implementazione nativa/di riferimento e non è una dipendenza di runtime del pacchetto.
I pacchetti QR, matrice e codice a barre pubblici mantengono i propri wrapper digitati;
tali API non vengono reindirizzate automaticamente tramite il grafico dello scanner.

Il `codecMigrationFixture` nel
`packages/forge-web-script/src/fixtures/codec-migration.ts` è il primo
dispositivo di conformità a forma di adattatore codec. Dichiara
`codec.barcode.encode(payload: string) -> bytes`, esporta `encode_payload`, convalida il
ABI con lunghezza del puntatore e utilizza un host iniettabile per scrivere l'output di proprietà del chiamante.
Rimane intenzionalmente un dispositivo ABI ristretto: l'host può utilizzare un deterministico
falso per i test di conformità mentre il dispositivo dimostra il Forge Web Script
confine. La parità dei codec di produzione richiede ancora la corrispondenza dei vettori e
misurazioni delle prestazioni, non solo il nome di una funzione corrispondente.

Il wrapper legacy corrispondente esporta `encode(symbology, data)` e restituisce
`Uint8Array | undefined`; l'apparecchiatura esporta `encode_payload(payload)` e
restituisce una coppia `bytes` di proprietà ABI. Quella differenza deliberata mantiene il
limite di capacità esplicito: un adattatore di migrazione può mappare l'eredità
simbologia/dati richiamano la capacità dichiarata, ma l'apparecchiatura no
far finta che le due esportazioni siano ancora comportamentalmente intercambiabili.

### Selezione di un'implementazione

| Carico di lavoro o requisito                                                     | Selezionare                                                            | Motivo                                                                                                                                                               |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comportamento del pacchetto QR o matrice esistente                               | `@mission-platform/qr-code` / `@mission-platform/matrix-code`          | I wrapper ESM tipizzati specifici del pacchetto rimangono disponibili per tali API pubbliche.                                                                        |
| Comportamento neutro dello scanner dell'immagine e della fotocamera              | `@mission-platform/code-scanner`                                       | Utilizza un grafico FWS collegato staticamente per impostazione predefinita o un profilo del modulo di origine dinamico esplicito con invio memorizzato nella cache. |
| Comportamento del codice a barre esistente                                       | `@mission-platform/barcode`                                            | I grafici Forge Web Script locali del pacchetto forniscono la facciata del codice a barre digitato.                                                                  |
| Nuovo calcolo sicuro per i browser per scopi generici con effetti host espliciti | Forgia script Web più `@mission-platform/vite-plugin-forge-web-script` | Funzionalità di origine `.fws` con versione, manifest, caricatore tipizzato e negazione per impostazione predefinita.                                                |
| Origine AssemblyScript esistente o migrazione specifica di AssemblyScript        | `@mission-platform/vite-plugin-assemblyscript`                         | Compila `.ts` voci AssemblyScript e conserva il contratto di esportazione raw generato.                                                                              |
| Compilazione dell'interfaccia utente/componente indipendente dal framework       | Compilatore di componenti Forge                                        | Forge Web Script non sostituisce `FrameworkOutputPlugin` o le destinazioni dei componenti.                                                                           |

Utilizzare il plug-in Forge Web Script Vite solo per le voci `.fws`. Usa il
Plug-in AssemblyScript per voci AssemblyScript esistenti. Durante la migrazione, an
l'applicazione può raggruppare entrambi i tipi di moduli: ogni caricatore possiede il proprio
l'inizializzazione, la memoria, la convalida ABI e le importazioni di capacità devono essere
fornito esplicitamente ai moduli Forge Web Script.

### Cancello delle prove e della deprecazione

Il lavoro di migrazione dovrebbe registrare quattro confronti indipendenti per ciascun candidato:

1. comportamento esportato contro i vettori dorati condivisi, inclusi input non validi e
   casi limite;
2. Sicurezza ABI, inclusi controlli manifest/versione, rifiuto di importazione, controlli dei limiti,
   conversione trap e proprietà del buffer;
3. stabilità degli artefatti generati, inclusi hash riproducibili, dichiarazioni,
   mappe di origine e caricamento nel browser/Node; e
4. una misurazione rappresentativa delle prestazioni di rilascio-build che copre la compilazione
   tempo, dimensione dell'artefatto, inizializzazione e chiamate allo stato stazionario.

Il dispositivo di migrazione attualmente fornisce le parti ABI e artefatto di questo
prove. I test esistenti sul wrapper di codici a barre e sul pacchetto di decodifica rimangono gli stessi
oracolo di regressione comportamentale e legacy; eseguirli piuttosto lungo il dispositivo
piuttosto che trattare l'apparecchio come un punto di riferimento sostitutivo. Forgiare la Rete
Lo script non deve deprecare un percorso Rust o AssemblyScript finché non viene superato il carico di lavoro
tutti e quattro i confronti nei due ambienti host supportati sono documentati
percorso di rollback e non presenta ABI o risultati di sicurezza irrisolti. Deprecazione quindi
richiede una finestra di compatibilità annunciata e un adattatore o una guida alla migrazione;
la rimozione richiede una successiva versione principale.

## Contratti aggregati e di esecuzione senza classi

Il contratto esteso senza classi aggiunge valori `struct` immutabili, contrassegnati con `enum`
valori, dichiarazioni strutturali `interface` in fase di compilazione, parametri generici
con limiti di interfaccia, valori di funzione, valori letterali/metodi di raccolta e
`match` espressioni/istruzioni. I costruttori di enumerazione qualificati utilizzano `Type::Variant`
e i collegamenti delle partite sono locali al braccio; per esempio,
`Result::Ok(item) => item` lega `item` solo in quel braccio. La norma
Il contratto `Result<T, E>` utilizza `Ok(T)` e `Error(E)`, non `Err(E)`.
Gli aggiornamenti delle strutture sono trasformazioni di valore puro; né strutture né interfacce
avere costruttori, identità, ereditarietà, ricevitori o invio di runtime. Qualunque
tentare di dichiarare costrutti orientati alla classe/oggetto (inclusi `class`,
`constructor`, `extends`, `impl`, `new` e `trait`) viene rifiutato con stabile
diagnostica `FWS-PARSE-052`.

I layout aggregati vengono registrati nel manifesto nell'ordine dei nomi canonici. Struttura
i campi sono valori ordinati e allineati a quattro byte; i layout enum iniziano con un file a quattro byte
discriminante. La proprietà del campo è esplicita (`owned`, `borrowed` o `shared`) e
per impostazione predefinita viene utilizzato lo spazio di archiviazione immutabile di proprietà. I valori generici sono specializzati per calcestruzzo
tipo; le rappresentazioni basate sul descrittore sono riservate all'iteratore esplicito o
confini dell'interfaccia e sono rappresentati da record di specializzazione.

Il contratto del bytecode della VM è indipendente dal backend. A`ForgeWebScriptVmModule`
contiene funzioni tipizzate, costanti, layout aggregati, specializzazioni,
importazioni di capacità, intervalli di origine e memoria lineare da 64 KiB
Limite `fws_alloc`/`fws_dealloc`/`fws_realloc`. `interpret`, `jit` e `aot` sono in esecuzione
modalità sulla stessa semantica istruzione/valore/trappola; Chiavi cache JIT e AOT
gli artefatti includono il compilatore e gli hash di origine. Le capacità sono solo richiamabili
quando presente nel manifest del modulo.

Lo stato di runtime reattivo è costituito dai dati: gli indici di entità utilizzano contatori di generazione,
i negozi e i mondi dei componenti sono istantanee immutabili e i sistemi restituiscono il mondo
transizioni. Segnali, abbonamenti, requisiti di query, ordine deterministico,
e i passaggi dello scheduler limitati sono valori espliciti. Richiede l'integrazione dell'host ECS
lo stesso limite di capacità dichiarato di qualsiasi altra importazione FWS.

## Confine dell'ambito

L'implementazione v1 è un frontend TypeScript più WebAssembly deterministico
backend, esposto attraverso la facciata di compatibilità e la CLI Node autonoma.
Gli elementi di conformità e gli artefatti generati rappresentano l'obiettivo di compatibilità.

La compilazione self-hosted (esecuzione del compilatore come programma FWS) è esplicita
supportato dalla superficie priva di classi del contratto v1 e dall'esecuzione del bytecode della VM
modello, ma non è richiesto per la correttezza dell'ABI v1 e del linguaggio
confine. Funzionalità linguistiche più ricche, sostituzione di Rust o
I carichi di lavoro AssemblyScript e altre evoluzioni del compilatore non v1 non rientrano in questo ambito
contratto.

## Taglio dell'utensileria e confine di bootstrap

La CLI, il plug-in Vite, il servizio linguistico e l'LSP utilizzano tutti il compilatore pubblico
contratto di servizio. La migrazione del lexer è intenzionalmente prioritaria per LSP: il check-in
La grammatica EBNF definisce il contratto token TypeScript, il servizio linguistico e
gli adattatori dell'editor sono il primo limite di accettazione e il compilatore/frontend o
la proprietà self-hosted non deve essere spostata fino a quando i tipi di token, la diagnostica, i simboli e
gli intervalli di completamento, passaggio del mouse e UTF-16 sono conformi. L'attuale FWS limitato creato
la fase lex/token rimane un percorso di parità di compatibilità mentre il lexer TypeScript
e il gate dei servizi linguistici viene migrato; non è l'autorità grammaticale.

Dopo che il gate LSP diventa verde, la stessa grammatica verrà trasferita al lexer FWS/VM
e poi allo stadio del modulo parser limitato. Il restante frontend, linker,
le fasi di ottimizzazione, manifest e emissione Wasm sono ancora supportate in questo
rilascio; questo confine è intenzionale ed è esposto come
`ForgeWebScriptSelfHostedStageReport` anziché essere presentato come completo
self-hosting.

La CLI seleziona la modalità VM con `--vm-mode interpret|jit|aot`. Il plugin Vite
e le opzioni dell'area di lavoro del servizio linguistico utilizzano il corrispondente `selfHostedVmMode`
valore. Tutte e tre le modalità eseguono lo stesso bytecode e confrontano l'impronta digitale lex
con il riferimento seme indipendente. Una mancata corrispondenza o una trappola VM diventa stabile
`FWS-BOOTSTRAP-001` diagnostica e impedisce la creazione di un artefatto Wasm non valido
emesso. `interpret` è destinato a controlli rapidi, mentre `jit` e `aot` sono
modalità di conformità/sviluppo; Wasm compilato rimane la normale produzione
artefatto e percorso di runtime.

Collegamento di grafici, dichiarazioni, mappe di origine, manifest ABI, hash deterministici,
proprietà della memoria lineare, negazione della capacità, valori di raccolta/ECS ed esplicito
le funzionalità di pianificazione asincrona rimangono regolate dai contratti pubblici esistenti.
Gli adattatori degli strumenti non aggiungono API host di ambiente o invio implicito di oggetti.
Microtask e Web Worker sono disponibili solo tramite lo scheduler dichiarato
capacità, e il loro ordinamento rimane esplicito e deterministico. Consumatori
dovrebbe trattare il report VM come un segnale di parità/conformità fino alle versioni successive
spostare ulteriori fasi del compilatore dietro lo stesso limite FWS.
