# Strumenti per il linguaggio Forge Web Script

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/forge-web-script-lsp/docs/reference/language-service.md: [packages/forge-web-script-lsp/docs/reference/language-service.md](../../../reference/language-service.md)
> Lingua: Italiano (it)

Forge Web Script (`.fws`) dispone di un servizio linguistico indipendente dall'editor, un stdio
Server Language Server Protocol (LSP) e un adattatore Monaco rivolto al browser.
Tutti e tre utilizzano il contratto eseguibile Forge Web Script v1 da
`@mission-platform/forge-web-script`, quindi diagnostica, intervalli di origine, simboli,
completamento e le informazioni al passaggio del mouse derivano dallo stesso parser e
validatore.

Il contratto linguistico supportato è la **versione 1.0** e il contratto ABI lo è
**versione 1.2**. Gli strumenti lo fanno
non modificare la grammatica, l'output del compilatore, l'ABI o il Rust and
Integrazioni AssemblyScript. Vedere [Forgia WebScript v1](../../../../../forge-web-script/docs/locales/it/reference/language.md)
per la lingua e riferimento ABI.

## Caratteristiche e confini

Il servizio linguistico attualmente prevede:

- diagnostica da lessing, parsing, controllo del tipo e convalida ABI;
- Gamme compatibili con UTF-16 adatte per LSP e Monaco;
- simboli del documento per moduli, funzioni, parametri, locali, capacità
  alias, tipi aggregati, campi, varianti enum, metodi di interfaccia, generici
  parametri, associazioni di iteratori, associazioni di corrispondenza e tipi primitivi;
- completamento per parole chiave Forge, tipi primitivi, dichiarazioni, locali,
  tipi aggregati, tipi generici, funzioni, stringhe di proprietà del compilatore e espressioni regolari
  funzioni, alias di capacità e nomi di capacità inventariati dall'host;
- passa il mouse sulle informazioni per dichiarazioni, parametri, locali, chiamate e
  la capacità viene importata quando l'AST identifica il simbolo, incluso l'aggregato
  tipi, tipi generici, chiamate alla libreria standard di proprietà del compilatore e rendering
  documentazione per funzioni definite dal codice sorgente; e
- Tokenizzazione lessicale v1 per commenti, stringhe, numeri, parole chiave, tipi,
  operatori, punteggiatura, dichiarazioni e testo non valido.

Il server LSP espone diagnostica, completamento, passaggio del mouse e semantica completa
gettoni. Vai alla definizione, riferimenti, ridenominazione, formattazione, azioni del codice,
importazioni di lingue tra file a livello di origine e trasporto LSP ospitato su browser
non sono implementati. Monaco utilizza invece l'adattatore del servizio linguistico locale
di connessione al server Node.

I token semantici utilizzano le classificazioni lessicali del servizio linguistico. Il
inizializza la risposta pubblicizza una legenda contenente `comment`, `declaration`,
`identifier`, `invalid`, `keyword`, `number`, `operator`, `punctuation`,
`string` e `type`; i client richiedono i token del documento completo codificati con
`textDocument/semanticTokens/full`.

## Documentazione delle funzioni nei risultati dell'editor

Il servizio linguistico espone la documentazione per il livello superiore definito dall'origine
funzioni. Utilizza la stessa stringa di documentazione normalizzata per la dichiarazione
passaggio del mouse, passaggio del mouse di riferimento e completamento della funzione. Funzionalità fornita dall'host
le firme continuano a utilizzare la documentazione di stringa opzionale esistente e lo sono
non analizzato come commenti Javadoc FWS.

Ad esempio, questa fonte:

```fws
/**
 * Adds one to a value.
 *
 * @param value Input value.
 * @return Incremented value.
 * @deprecated Prefer `increment` in new code.
 */
export fn add(value: i32) -> i32 {
  return value + 1;
}

export fn caller() -> i32 {
  return add(1);
}
```

Passando su `add` alla sua dichiarazione o alla chiamata in `caller` restituisce il
firma seguita dalla documentazione resa:

```text
export add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

Passando su `add` sul sito di chiamata in `caller` viene restituita la stessa documentazione
con la firma non dichiarativa:

```text
add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

Il completamento per `add` porta con sé la stessa stringa di documentazione
dettaglio/firma. I paragrafi e i tag descrittivi sono separati da righe vuote;
l'ordine dei tag, i tag duplicati e i tag sconosciuti vengono conservati. La sintassi principale e
regole di normalizzazione, inclusa l'associazione della funzione e il soggetto supportato
moduli, sono specificati in [il riferimento del linguaggio FWS](../../../../../forge-web-script/docs/locales/it/reference/language.md).

La documentazione è costituita solo da metadati informativi. Non modifica la diagnostica,
controllo del tipo, risoluzione delle funzioni, dichiarazioni generate, firme ABI,
manifest, Wasm/WAT, comportamento di runtime o hash eseguibili. Una documentazione
edit pertanto modifica il contenuto del passaggio del mouse e del completamento senza modificare il file
contratto del modulo compilato.

### Rappresentazione LSP

Il server stdio mappa il risultato del servizio linguistico indipendente dal framework su standard
Valori LSP:

- `textDocument/hover` restituisce Markdown il cui valore si unisce alla firma e
  documentazione con una riga vuota;
- `textDocument/completion` imposta `documentation` di ciascun elemento della funzione sorgente
  campo nella stessa stringa visualizzata e lascia la firma `detail` esistente
  invariato.

Il server LSP non reinterpreta i tag né applica la formattazione specifica dell'editor.
I clienti possono visualizzare il testo Markdown/normale restituito così com'è.

### Rappresentazione di Monaco

`@mission-platform/content` registra lo stesso servizio linguistico in-process
provider utilizzati da `ForgeMonacoEditor`:

- Il passaggio del mouse su Monaco `contents` contiene la firma e la documentazione resa come
  valori separati compatibili con Markdown;
- Il campo `documentation` del suggerimento di una funzione di origine contiene lo stesso
  stringa resa come completamento LSP;
- per entrambi rimane invariata la classificazione lessicale del token `comment`
  commenti di blocco ordinario e di documentazione.

L'adattatore Monaco non si connette al server LSP Node né duplica il file
analizzatore di documentazione. Inoltra il risultato del servizio linguistico, quindi browser e
I client stdio rimangono coerenti ed entrambi utilizzano intervalli di origine UTF-16.

## Esegui il server stdio

Il server è pubblicato come `@mission-platform/forge-web-script-lsp` e
espone l'eseguibile `forge-web-script-lsp`. Parla LSP standard
stdin/stdout; i messaggi di protocollo non vengono mai scritti sullo stdout dall'applicazione
registrazione. I messaggi di disponibilità e di errore vengono scritti su stderr.

Da un checkout di questo repository, crealo ed eseguilo con:

```sh
pnpm --filter @mission-platform/forge-web-script-lsp build
node packages/forge-web-script-lsp/dist/main.js
```

Quando il pacchetto viene installato in un progetto esterno, configurare il client
per richiamare direttamente l'eseguibile del pacchetto:

```sh
forge-web-script-lsp
```

Il server richiede Node.js 24 o versione successiva. Non accetta un flag `--stdio`;
stdio è sempre il trasporto. Un client deve inviare `initialize`, utilizzare il file
funzionalità restituite, quindi inviare la normale notifica `initialized`.
Il server supporta la sincronizzazione full-text, le cartelle dell'area di lavoro, controllate
modifiche ai file, completamento, passaggio del mouse e arresto/uscita.

### Esempi di configurazione del client Stdio

Dovrebbero essere utilizzati i client che accettano un comando e argomenti separatamente
`forge-web-script-lsp` per i pacchetti installati. Un checkout può utilizzare `node` e
l'entrypoint costruito invece:

```json
{
  "command": "node",
  "args": ["${workspaceFolder}/packages/forge-web-script-lsp/dist/main.js"],
  "filetypes": ["fws"],
  "rootPatterns": ["package.json", ".git"]
}
```

Ad esempio, il client LSP integrato di Neovim può utilizzare l'eseguibile installato:

```lua
vim.lsp.config('forge_web_script', {
  cmd = { 'forge-web-script-lsp' },
  filetypes = { 'fws' },
  root_markers = { 'package.json', '.git' },
})
vim.lsp.enable('forge_web_script')
```

Helix può utilizzare lo stesso eseguibile in `languages.toml`:

```toml
[language-server.forge-web-script-lsp]
command = "forge-web-script-lsp"

[[language]]
name = "fws"
scope = "source.fws"
file-types = ["fws"]
language-servers = ["forge-web-script-lsp"]
```

VS Code richiede un'estensione client LSP; configurare quell'estensione con il
stesso comando e argomenti anziché aggiungere questi campi all'ordinario
`settings.json`.

## Integrazioni dell'editor

Questo repository fornisce client proprietari per VS Code e IntelliJ IDEA.
Entrambi i client utilizzano questo server stdio per la diagnostica, il completamento, il passaggio del mouse e
token semantici completi; nessuno dei due client contiene un parser, un modello PSI o una semantica
implementazione dell'analisi. Il server richiede Node.js **24 o successivo**. A
Il runtime Node specifico della piattaforma non è incluso nell'integrazione dell'editor.

### Codice VS

Installare il file `fws-vscode-0.1.0.vsix` dal file
`extensions/fws-vscode` output di rilascio con **Estensioni: installazione da VSIX**,
quindi ricaricare VS Code. L'apertura di un file `.fws` attiva l'estensione. Il
il percorso di avvio predefinito è il server in bundle nel VSIX e l'estensione
lo avvia con l'eseguibile Node configurato su stdio.

L'estensione contribuisce con l'id della lingua `fws`, l'associazione del nome file `.fws`,
commenti/parentesi/evidenziazione lessicale della linea di base e un osservatore di file LSP. Il
il server rimane responsabile dei token semantici e di tutto il comportamento del linguaggio.
Le cartelle dell'area di lavoro vengono inviate in `initialize` come URI `file:`, preservando
contratto di root dell'area di lavoro e di isolamento del percorso del server.

Configura l'interno nelle impostazioni VS Code (o `settings.json`):

```json
{
  "forgeWebScript.nodePath": "/path/to/node-24/bin/node",
  "forgeWebScript.serverPath": "",
  "forgeWebScript.serverArgs": [],
  "forgeWebScript.trace.server": "off"
}
```

Per impostazione predefinita `forgeWebScript.nodePath` è `node` e deve risolversi in Node 24 o
più recente. Lasciare vuoto `forgeWebScript.serverPath` per utilizzare il server in pacchetto;
impostarlo su un percorso assoluto o su un percorso relativo alla prima cartella dell'area di lavoro
per testare un `dist/main.js` creato localmente o fornito dal progetto. Ulteriori
gli argomenti vengono passati dopo il punto di ingresso del server. Utilizzare `messages` o `verbose`
per il tracciamento LSP; gli errori di avvio vengono scritti nel **Forge Web Script
Canale di output del Language Server** e visualizzato come errore dell'editor.

Per lo sviluppo locale da questo repository:

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
```

La build crea innanzitutto il pacchetto LSP condiviso e quindi mette in scena il suo punto di ingresso
e dipendenze di runtime in `extensions/fws-vscode/server`. `package`
produce `extensions/fws-vscode/fws-vscode-0.1.0.vsix`; fonti di sviluppo
e i file di test sono esclusi da `.vscodeignore`. Il controllo del fumo confezionato
inizializza il server di stage e verifica il completamento pubblicizzato, passa il mouse,
token semantico e comportamento diagnostico stabile.

### IntelliJ IDEA/LSP4IJ

Crea il plugin ZIP e installalo tramite **Impostazioni | Plugin | Ingranaggio |
Installa il plugin dal disco**:

```sh
cd extensions/fws-ij
JAVA_HOME=/path/to/jdk-23 ./gradlew test verifyPlugin buildPlugin --no-daemon --offline
```

Il risultante `build/distributions/fws-ij-0.1.0.zip` contiene il file thin
Integrazione LSP4IJ. Il plugin viene compilato con la comunità IntelliJ IDEA
2024.3.3 (build 243), mantiene un intervallo di compatibilità illimitato dalla build
243 in poi ed è verificato rispetto a WebStorm 2026.2.1 (ramo 262, incluso
`WS-262.9437.145`). Blocca LSP4IJ 0.20.1 e non raggruppa Node.js o il
server della lingua. Riavviare l'IDE dopo l'installazione se non lo fa immediatamente
riconoscere i file `.fws`.

Il plugin mappa `*.fws` sull'ID lingua `fws` e avvia uno stdio condiviso
server per il progetto. La configurazione di IntelliJ è fornita esclusivamente da
**Impostazioni | Strumenti | Forgia script web**; non esiste una sceneggiatura del progetto o Flora
percorso di configurazione. Configura:

- **Node.js eseguibile** — Node 24 o successivo; il valore predefinito è `node`.
- **Comando/percorso server lingua**: il valore predefinito è `forge-web-script-lsp` e
  risolve un'installazione del progetto `node_modules/.bin` (incluso ancestor
  radici dell'area di lavoro) o `PATH`. Un punto di ingresso JavaScript esplicito come
  Anche `node_modules/@mission-platform/forge-web-script-lsp/dist/main.js` lo è
  supportato.
- **Argomenti server**: argomenti facoltativi tra virgolette passati al server.
- **Traccia LSP**: `off`, `messages` o `verbose`.
- **Avvia il server della lingua quando viene aperto un file FWS**: attiva/disattiva l'avvio.

Per una CLI locale del progetto, installa il server nel progetto aperto da IntelliJ:

```sh
pnpm add -D @mission-platform/forge-web-script-lsp
```

Il plugin utilizza la root del progetto IntelliJ come directory di lavoro del processo.
LSP4IJ fornisce il ciclo di vita del documento e le notifiche dell'area di lavoro; il
l'host delimitato dalla radice del server esegue l'enumerazione dei file, watch-file
invalidazione e tutta l'analisi del linguaggio. Lo stesso stato delle Impostazioni in pacchetto è
utilizzato sia dal launcher LSP che dall'adattatore DAP stdio generico.

### Convalida tra editor diversi

Esegui i controlli del servizio linguistico/LSP condiviso ed entrambe le pipeline client dal file
radice del deposito. I comandi IntelliJ richiedono un JDK supportato da pinned
catena di strumenti Gradle/IntelliJ; quello che segue è un esempio per macOS:

```sh
pnpm --filter @mission-platform/forge-web-script-language-service test
pnpm --filter @mission-platform/forge-web-script-language-service build:check
pnpm --filter @mission-platform/forge-web-script-language-service lint
pnpm --filter @mission-platform/forge-web-script-language-service format
pnpm --filter @mission-platform/forge-web-script-lsp test
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp lint
pnpm --filter @mission-platform/forge-web-script-lsp format
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-23.jdk/Contents/Home \
  ./extensions/fws-ij/gradlew -p extensions/fws-ij test verifyPlugin buildPlugin --no-daemon --offline
```

I test del fumo staged-server e IntelliJ esercitano la stessa inizializzazione,
diagnostica, completamento, passaggio del mouse, token semantico, arresto e radice del progetto
contratto di lancio. I test LSP condivisi coprono inoltre la cartella dell'area di lavoro
inoltro, gestione URI `file:`, invalidazione file controllati contenuti nella root,
codici/intervalli diagnostici stabili e smaltimento. I client editor dovrebbero esporre
solo le funzionalità pubblicizzate dal server; vai alla definizione, riferimenti,
rimangono la ridenominazione, la formattazione, le azioni del codice e le importazioni di lingue tra file
non supportato.

### Risoluzione dei problemi

- **Node runtime rifiutato:** esegui `<configured-node> --version` e seleziona un
  Node 24+ eseguibili nel relativo codice VS o impostazione IntelliJ. Il cliente
  segnala la versione rilevata e non torna silenziosamente a una versione precedente
  tempo di esecuzione.
- **Server in pacchetto VS Code mancante:** ricostruisci con
  `pnpm exec turbo run build --filter=fws-vscode`, conferma
  `extensions/fws-vscode/server/dist/main.js` esiste o è impostato
  `forgeWebScript.serverPath` a un punto di ingresso creato valido. Ispezionare il
  Canale di output **Forge Web Script Language Server** con traccia abilitata.
- **Comando del server IntelliJ non trovato:** installa
  `@mission-platform/forge-web-script-lsp` nel progetto aperto, assicurati che sia
  `node_modules/.bin` è presente oppure configurare un comando/percorso esplicito. Il
  il plugin riporta la root del progetto cercato e il percorso di installazione suggerito.
- **Nessuna diagnostica o completamento:** verificare che il file sia denominato `.fws`, il
  il client è abilitato e l'area di lavoro ha una radice del progetto. Controlla il cliente
  canale di traccia/output e verificare che il server abbia ricevuto l'area di lavoro `file:`
  cartelle; senza root, possono essere serviti solo i documenti già aperti.
- **Funzionalità dell'editor impreviste:** queste integrazioni non lo fanno intenzionalmente
  aggiungere parser o logica semantica. Confronta funzionalità e `FWS-*` stabile
  codici diagnostici con questo documento e il pacchetto LSP condiviso anziché
  aggiungendo un comportamento specifico dell'editor.

Il client deve inviare le cartelle dell'area di lavoro come URI `file:` quando supportato. Il
il server utilizza prima le cartelle dell'area di lavoro e poi ritorna a `rootUri`; se nessuno dei due lo è
a condizione che l'host del filesystem non abbia root e possa servire solo già aperto
documenti.

## Comportamento e sicurezza dello spazio di lavoro

Il server Node crea un host dell'area di lavoro supportato da file system dalle radici
la richiesta di inizializzazione dell'LSP. Enumera ricorsivamente i file sotto quelli
root, legge i file necessari per l'analisi dell'area di lavoro e controlla i file contenuti in root
modifiche al file. I percorsi vengono canonizzati e i collegamenti simbolici vengono risolti prima delle letture;
un accesso esterno ad ogni root configurato viene rifiutato. Schemi URI non supportati
non sono trattati come percorsi di filesystem.

L'identità dell'area di lavoro è basata su URI. Due documenti con lo stesso nome base ma
URI diversi rimangono documenti separati e voci della cache. Chiusura a
Il documento rimuove la diagnostica dal client. Creare, cambiare o
l'eliminazione di un file controllato invalida l'analisi dipendente dall'area di lavoro e viene ripubblicato
diagnostica per i documenti aperti.

Il server non introduce un file di configurazione del progetto. La CLI standard
attualmente fornisce opzioni di spazio di lavoro vuote a meno che un host non venga inserito dal codice.
Il contratto di spazio di lavoro di servizi linguistici è:

```ts
interface ForgeWebScriptWorkspaceHost {
  readFile(uri: string): Promise<string | undefined>;
  listFiles(): Promise<readonly string[]>;
  getOptions(uri: string): Promise<ForgeWebScriptWorkspaceOptions>;
  watch?(listener: (change: ForgeWebScriptWorkspaceChange) => void): {
    dispose(): void;
  };
}

interface ForgeWebScriptWorkspaceOptions {
  requestedCapabilities?: readonly string[];
  requireExports?: boolean;
  capabilityNames?: readonly string[];
  capabilitySignatures?: ReadonlyMap<string, ForgeWebScriptCallable>;
}
```

A cui vengono passati `requestedCapabilities` e `requireExports`
`validateForgeWebScript`. Un'importazione di capacità non consentita da
l'area di lavoro produce la diagnostica ABI stabile `FWS-ABI-002`; legati alle esportazioni
i requisiti utilizzano il corrispondente contratto `FWS-ABI-003`. Nomi di capacità
e anche le firme alimentano il completamento e il passaggio del mouse, ma non vengono mai dedotte
ambiente Node o API del browser.

### Politica di esportazione dell'editore

Per impostazione predefinita, l'analisi dell'editor è permissiva riguardo alle funzioni private del modulo. Quando
`requireExports` viene omesso dall'host LSP standard, uno spazio di lavoro inserito
host o un host dell'area di lavoro Monaco, viene trattato come `false`, quindi un assistente privato
può essere chiamato da un'altra funzione nello stesso modulo senza produrre
`FWS-ABI-003`. Le funzioni private rimangono disponibili per i simboli dello stesso modulo,
completamento, passaggio del mouse e risoluzione di chiamata/tipo, ma non sono esportazioni Wasm ABI.

Gli host che desiderano la diagnostica solo ABI possono impostare `requireExports: true` a livello globale o
per un documento tramite `optionsForUri`; cambiando quella politica e aggiornando il
l'area di lavoro invalida l'analisi memorizzata nella cache. L'impostazione `requireExports: false` è un
politica esplicita e permissiva. L'impostazione predefinita di questo editor non modifica la compilazione:
`@mission-platform/forge-web-script` continua a richiedere `export fn` per ogni
funzione ABI del compilatore quando la relativa opzione `requireExports` viene omessa.

Quando si utilizza il core o un server LSP creato a livello di codice, chiamare
`refreshWorkspace(uri)` dopo aver aperto un documento e prima di farvi affidamento
diagnostica, completamento o passaggio del mouse derivati dall'area di lavoro. L'adattatore LSP funziona
questo aggiornamento prima di pubblicare la diagnostica e prima di fornire il completamento o
richieste al passaggio del mouse.

## Diagnostica e intervalli

La diagnostica mantiene `code` stabile del validatore, gravità, fase, messaggio,
nome file, intervallo di origine e suggerimento facoltativo. La rappresentazione LSP utilizza il file
`Position` standard in base zero e `Range` semiaperto; contano gli offset dei caratteri
Unità di codice UTF-16, incluso quando Unicode viene visualizzato prima della diagnostica.

Il server LSP pubblica `source: "forge-web-script"`. La fase e il suggerimento sono
incluso anche nell'oggetto diagnostico `data`. Tipiche famiglie di codici stabili
sono:

| Famiglia di codici | Fase         | Significato                                                                                                                 |
| ------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `FWS-LEX-*`        | `lex`        | Caratteri/escape non validi, terminatori di riga di stringhe non elaborate o stringhe/commenti di blocco senza terminazione |
| `FWS-PARSE-*`      | `parse`      | Sintassi di modulo, dichiarazione, istruzione o espressione non valida                                                      |
| `FWS-TYPE-*`       | `type-check` | Tipi, nomi, operatori, argomenti o risultati non validi                                                                     |
| `FWS-ABI-*`        | `abi`        | Nomi duplicati, funzionalità, esportazioni o importazioni negate                                                            |

L'input non valido viene ancora tokenizzato e analizzato laddove consentito dal ripristino del parser
esso. Ad esempio, un'origine non valida può produrre `FWS-PARSE-017` pur conservando
token lessicali utilizzabili e informazioni parziali sui simboli. I client dovrebbero visualizzare
l'intervallo e il codice forniti anziché il testo diagnostico corrispondente.

La lessificazione di stringhe accetta solo escape compatibili con JSON (`\\`, `\"`, `\/`, `\b`,
`\f`, `\n`, `\r`, `\t` e `\uXXXX`). Terminatori di riga non elaborati, escape non validi,
e le barre rovesciate finali producono diagnosi lessicali (`FWS-LEX-004` o
`FWS-LEX-005`). Gli intervalli lexer e diagnostici sono limitati dalla lunghezza dell'origine;
i client possono convertirli in modo sicuro direttamente negli intervalli LSP UTF-16.

## Incorporamento dell'adattatore Monaco

L'adattatore del browser viene esportato da `@mission-platform/content` e risiede in
`packages/content/src/monaco/forge-web-script.ts`. `ForgeMonacoEditor` viene caricato
l'adattatore pigramente quando `language="fws"`; Monaco rimane un'importazione di solo tipo
il grafico del componente sincrono, quindi il rendering lato server non viene valutato
Monaco.

L'utilizzo del componente più semplice è:

```tsx
<ForgeMonacoEditor
  language="fws"
  modelValue={'export fn add(value: i32) -> i32 {\n  return value + 1;\n}'}
/>
```

Impostare `forgeWebScript={false}` per disabilitare l'integrazione automatica. Altrimenti,
il componente registra la lingua `fws` e l'estensione `.fws`, utilizza Monaco
categorie di token integrate per i temi (`keyword`, `type`, `string`, `comment`,
`number`, `operator`, `delimiter` e `invalid`), sincronizza il
modello, pubblica marcatori e registra i fornitori di completamento e passaggio del mouse.

Per gli strumenti del browser compatibili con le funzionalità, fornire un oggetto dell'area di lavoro di proprietà dell'host:

```tsx
const workspaceHost: ForgeWebScriptWorkspaceHost = {
  readFile: async (uri) => files.get(uri),
  listFiles: async () => [...files.keys()],
  getOptions: async () => ({
    requestedCapabilities: ['clock.now'],
    capabilityNames: ['clock.now'],
    capabilitySignatures: new Map([
      [
        'clock.now',
        {
          parameters: [],
          result: 'i64',
          documentation: 'Read the current Unix timestamp.',
        },
      ],
    ]),
  }),
};

<ForgeMonacoEditor
  language="fws"
  forgeWebScript={{ workspaceHost }}
  modelValue={'import capability "clock.now" as now() -> i64;\nexport fn current() -> i64 {\n  return now();\n}'}
/>;
```

L'host viene deliberatamente inserito: gli utenti del browser devono fornire letture,
enumerazione dei file, opzioni del progetto e notifiche di modifica facoltative da
il proprio stato di archiviazione o applicazione. L'adattatore non presuppone mai Node
API del filesystem e non si connette al server stdio. Smaltire il reso
handle dell'adattatore (o smontare `ForgeMonacoEditor`) per rimuovere i listener del modello,
provider, marcatori e cache di servizi.

Per l'integrazione obbligatoria, utilizzare lo stesso adattatore direttamente dopo Monaco
stato caricato:

```ts
import { attachForgeWebScriptMonaco, registerForgeWebScriptLanguage } from '@mission-platform/content';

registerForgeWebScriptLanguage(monaco);
const handle = attachForgeWebScriptMonaco(editor, monaco, { workspaceHost });

await handle.refresh();
// On editor teardown:
handle.dispose();
```

È sicuro chiamare `registerForgeWebScriptLanguage` quando `fws` è già presente
registrato. L'handle di registrazione elimina i provider di token; l'adattatore
handle dispone inoltre di fornitori di completamento/passaggio del mouse, ascoltatori di modelli,
marcatori e la relativa istanza del servizio linguistico di proprietà.

## LSP rispetto agli spazi di lavoro del browser

| Consumatore     | Implementazione dell'area di lavoro                | Limite root/sicurezza                                                               | Trasporti             |
| --------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------- |
| Node Client LSP | `RootBoundedForgeWebScriptWorkspaceHost`           | Root del filesystem configurato canonicamente; le letture esterne vengono rifiutate | stdio LSP             |
| Monaco/browser  | Applicazione fornita `ForgeWebScriptWorkspaceHost` | L'host decide quali URI/file/opzioni esporre; nessun presupposto sul filesystem     | Adattatore in-process |

Entrambi gli adattatori utilizzano gli stessi contratti di servizio linguistico e la stessa semantica di analisi,
ma non condividono un archivio o un trasporto di documenti. Un host del browser non deve
passare le funzioni del filesystem Node in un bundle del browser. Al contrario, il file Node LSP
server dovrebbe essere utilizzato per client esterni anziché tentare di eseguirlo
host del filesystem a Monaco.

## Validazione e conformità

I pacchetti di servizi linguistici e LSP includono test per accettato e rifiutato
dispositivi di bootstrap, codici diagnostici e intervalli UTF-16, input non valido,
invalidazione dello spazio di lavoro, isolamento root, sincronizzazione LSP, completamento,
passaggio del mouse e smaltimento. Il pacchetto di contenuti include adattatore, evidenziazione,
copertura di marcatori, fornitori, smaltimento e editor SSR/non Forge.

Esegui i controlli mirati dalla root del repository:

```sh
pnpm --filter @mission-platform/forge-web-script-language-service test
pnpm --filter @mission-platform/forge-web-script-language-service build:check
pnpm --filter @mission-platform/forge-web-script-language-service lint
pnpm --filter @mission-platform/forge-web-script-language-service format

pnpm --filter @mission-platform/forge-web-script-lsp test
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp lint
pnpm --filter @mission-platform/forge-web-script-lsp format

pnpm --filter @mission-platform/content exec vitest run \
  src/monaco/forge-web-script.spec.ts \
  src/components/organisms/forge-monaco-editor/forge-monaco-editor.spec.ts
pnpm --filter @mission-platform/content build:check
```

I comandi lint e format del contenuto a livello di pacchetto controllano anche CSS/SCSS non correlati
file; un errore limitato a quei file esistenti non è uno script Web Forge
regressione degli strumenti linguistici. Le aspettative del dispositivo linguistico autorevole
rimangono in `../../../forge-web-script/src/fixtures/bootstrap.ts` e il
[riferimento linguistico](../../../../../forge-web-script/docs/locales/it/reference/language.md).
