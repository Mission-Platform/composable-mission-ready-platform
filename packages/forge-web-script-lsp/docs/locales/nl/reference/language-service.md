# Forge Web Script-taaltools

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/forge-web-script-lsp/docs/reference/language-service.md: [packages/forge-web-script-lsp/docs/reference/language-service.md](../../../reference/language-service.md)
> Taal: Nederlands (nl)

Forge Web Script (`.fws`) heeft een editor-neutrale taalservice, een stdio
Language Server Protocol (LSP)-server en een browsergerichte Monaco-adapter.
Alle drie gebruiken ze het uitvoerbare Forge Web Script v1-contract van
`@mission-platform/forge-web-script`, dus diagnostiek, bronbereiken, symbolen,
voltooiings- en hover-informatie zijn afgeleid van dezelfde parser en
validator.

Het ondersteunde taalcontract is **versie 1.0** en het ABI-contract is
**versie 1.2**. De tooling wel
verander de grammatica, compileruitvoer, ABI of de bestaande Rust en
AssemblyScript-integraties. Zien [Forge WebScript v1](../../../../../forge-web-script/docs/locales/nl/reference/language.md)
voor de taal en ABI-referentie.

## Kenmerken en grenzen

De taaldienst biedt momenteel:

- diagnostiek van lexing, parsing, typecontrole en ABI-validatie;
- UTF-16-bewuste reeksen geschikt voor LSP en Monaco;
- documentsymbolen voor modules, functies, parameters, lokale waarden, mogelijkheden
  aliassen, aggregatietypen, velden, enumvarianten, interfacemethoden, algemeen
  parameters, iteratorbindingen, matchbindingen en primitieve typen;
- voltooiing voor Forge-trefwoorden, primitieve typen, declaraties, lokale waarden,
  aggregatietypen, algemene typen, functies, tekenreeksen die eigendom zijn van de compiler en regex
  functies, capaciteitaliassen en door de host geïnventariseerde capaciteitsnamen;
- zweefinformatie voor declaraties, parameters, locals, oproepen en
  mogelijkheid wordt geïmporteerd wanneer de AST het symbool identificeert, inclusief aggregatie
  typen, generieke typen, standaardbibliotheekaanroepen die eigendom zijn van de compiler en gerenderd
  documentatie voor brongedefinieerde functies; en
- v1 lexicale tokenisatie voor opmerkingen, tekenreeksen, cijfers, trefwoorden, typen,
  operatoren, interpunctie, declaraties en ongeldige tekst.

De LSP-server biedt diagnostiek, voltooiing, hover en volledige semantiek
tokens. Ga naar definitie, referenties, hernoemen, opmaak, codeacties,
invoer van meerdere bestanden op bronniveau en een door een browser gehost LSP-transport
worden niet geïmplementeerd. Monaco gebruikt in plaats daarvan de lokale taalserviceadapter
om verbinding te maken met de Node-server.

Semantische tokens maken gebruik van de lexicale classificaties van de taalservice. De
initialiseren antwoord adverteert een legenda met daarin `comment`, `declaration`,
`identifier`, `invalid`, `keyword`, `number`, `operator`, `punctuation`,
`string` en `type`; klanten vragen de gecodeerde volledige documenttokens aan
`textDocument/semanticTokens/full`.

## Functiedocumentatie in editorresultaten

De taalservice stelt documentatie beschikbaar voor het door de bron gedefinieerde topniveau
functies. Het gebruikt dezelfde genormaliseerde documentatiereeks voor declaratie
hover, referentie hover en functie-voltooiing. Door de host geleverde mogelijkheden
handtekeningen blijven hun bestaande optionele tekenreeksdocumentatie gebruiken en zijn dat ook
niet geparseerd als FWS Javadoc-opmerkingen.

Deze bron bijvoorbeeld:

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

Als u de muisaanwijzer op `add` plaatst bij de aangifte of bij de aanroep in `caller`, wordt de
handtekening gevolgd door de weergegeven documentatie:

```text
export add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

Als u de muisaanwijzer op `add` op de oproepsite in `caller` plaatst, wordt dezelfde documentatie geretourneerd
met de niet-aangifte handtekening:

```text
add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

Bij voltooiing voor `add` wordt dezelfde documentatiereeks naast de
detail/handtekening. Beschrijvingsparagrafen en tags worden gescheiden door lege regels;
tagvolgorde, dubbele tags en onbekende tags blijven behouden. De kernsyntaxis en
normalisatieregels, inclusief functieassociatie en het ondersteunde onderwerp
formulieren, zijn gespecificeerd in [de FWS-taalreferentie](../../../../../forge-web-script/docs/locales/nl/reference/language.md).

Documentatie bestaat uitsluitend uit informatieve metadata. Het verandert niets aan de diagnostiek,
typecontrole, functieresolutie, gegenereerde aangiften, ABI-handtekeningen,
manifesten, Wasm/WAT, runtime-gedrag of uitvoerbare hashes. Een documentatie
edit verandert daarom de hover- en voltooiingsinhoud zonder de
samengesteld modulecontract.

### LSP-weergave

De stdio-server wijst het raamwerkneutrale taalserviceresultaat toe aan standaard
LSP-waarden:

- `textDocument/hover` retourneert Markdown waarvan de waarde samenkomt met de handtekening en
  documentatie met een lege regel;
- `textDocument/completion` stelt de `documentation` van elk bronfunctie-item in
  veld naar dezelfde weergegeven tekenreeks en laat de bestaande `detail`-handtekening behouden
  onveranderd.

De LSP-server herinterpreteert tags niet en past geen editorspecifieke opmaak toe.
Clients kunnen de geretourneerde Markdown/platte tekst weergeven zoals deze is.

### Monaco-weergave

`@mission-platform/content` registreert dezelfde taalservice in het proces
providers gebruikt door `ForgeMonacoEditor`:

- Monaco hover `contents` bevat de handtekening en weergegeven documentatie als
  afzonderlijke Markdown-compatibele waarden;
- het veld `documentation` van een bronfunctiesuggestie bevat hetzelfde
  weergegeven tekenreeks als LSP-voltooiing;
- de lexicale tokenclassificatie `comment` blijft voor beide ongewijzigd
  gewone opmerkingen en opmerkingen over documentatieblokken.

De Monaco-adapter maakt geen verbinding met de Node LSP-server of dupliceert de
documentatie-parser. Het stuurt het resultaat van de taalservice door, dus browser en
stdio-clients blijven consistent en beide gebruiken UTF-16-bronbereiken.

## Voer de stdio-server uit

De server wordt gepubliceerd als `@mission-platform/forge-web-script-lsp` en
toont het uitvoerbare bestand `forge-web-script-lsp`. Het spreekt standaard LSP over
stdin/stdout; protocolberichten worden nooit door een toepassing naar stdout geschreven
loggen. Gereedheids- en foutmeldingen worden naar stderr geschreven.

Vanuit het afrekenen van deze repository kunt u deze bouwen en uitvoeren met:

```sh
pnpm --filter @mission-platform/forge-web-script-lsp build
node packages/forge-web-script-lsp/dist/main.js
```

Wanneer het pakket in een extern project wordt geïnstalleerd, configureert u de client
om het uitvoerbare pakket rechtstreeks aan te roepen:

```sh
forge-web-script-lsp
```

De server vereist Node.js 24 of nieuwer. Er is geen `--stdio`-vlag nodig;
stdio is altijd het transport. Een client moet `initialize` verzenden, gebruik de
geretourneerde mogelijkheden en verzend vervolgens de normale `initialized`-melding.
De server ondersteunt volledige tekstsynchronisatie, werkruimtemappen, bewaakt
bestandswijzigingen, voltooiing, hover en afsluiten/afsluiten.

### Voorbeelden van stdio-clientconfiguraties

Clients die een commando en argumenten afzonderlijk accepteren, moeten dit gebruiken
`forge-web-script-lsp` voor geïnstalleerde pakketten. Een kassa kan `node` en
het ingebouwde toegangspunt in plaats daarvan:

```json
{
  "command": "node",
  "args": ["${workspaceFolder}/packages/forge-web-script-lsp/dist/main.js"],
  "filetypes": ["fws"],
  "rootPatterns": ["package.json", ".git"]
}
```

De ingebouwde LSP-client van Neovim kan bijvoorbeeld het geïnstalleerde uitvoerbare bestand gebruiken:

```lua
vim.lsp.config('forge_web_script', {
  cmd = { 'forge-web-script-lsp' },
  filetypes = { 'fws' },
  root_markers = { 'package.json', '.git' },
})
vim.lsp.enable('forge_web_script')
```

Helix kan hetzelfde uitvoerbare bestand gebruiken in `languages.toml`:

```toml
[language-server.forge-web-script-lsp]
command = "forge-web-script-lsp"

[[language]]
name = "fws"
scope = "source.fws"
file-types = ["fws"]
language-servers = ["forge-web-script-lsp"]
```

VS Code vereist een LSP-clientextensie; configureer die extensie met de
dezelfde opdracht en argumenten in plaats van deze velden aan het gewone toe te voegen
`settings.json`.

## Editor-integraties

Deze repository biedt first-party clients voor VS Code en IntelliJ IDEA.
Beide clients gebruiken deze stdio-server voor diagnostiek, voltooiing, hover en
volledige semantische tokens; geen van beide clients bevat een parser, PSI-model of semantiek
analyse implementatie. De server vereist Node.js **24 of nieuwer**. EEN
platformspecifieke Node-runtime wordt niet gebundeld met editorintegratie.

### VS-code

Installeer het `fws-vscode-0.1.0.vsix`-bestand van de
`extensions/fws-vscode` geeft uitvoer vrij met **Extensies: installeren vanaf VSIX**,
Laad vervolgens VS Code opnieuw. Het openen van een `.fws`-bestand activeert de extensie. De
het standaard opstartpad is de server die in de VSIX is gebundeld, en de extensie
start het met het geconfigureerde uitvoerbare bestand Node via stdio.

De extensie draagt de `fws` taal-ID, `.fws` bestandsnaamassociatie bij,
basisopmerkingen/haakjes/lexicale markering en een LSP-bestandswatcher. De
server blijft verantwoordelijk voor semantische tokens en al het taalgedrag.
Werkruimtemappen worden in `initialize` verzonden als `file:` URI's, waarbij de
het werkruimte-root- en pad-isolatiecontract van de server.

Configureer de extensie in VS Code-instellingen (of `settings.json`):

```json
{
  "forgeWebScript.nodePath": "/path/to/node-24/bin/node",
  "forgeWebScript.serverPath": "",
  "forgeWebScript.serverArgs": [],
  "forgeWebScript.trace.server": "off"
}
```

`forgeWebScript.nodePath` is standaard `node` en moet worden omgezet in Node 24 of
nieuwer. Laat `forgeWebScript.serverPath` leeg om de pakketserver te gebruiken;
stel het in op een absoluut pad of een pad relatief ten opzichte van de eerste werkruimtemap
om een lokaal gebouwde of door een project geleverde `dist/main.js` te testen. Extra
argumenten worden doorgegeven na het serveringangspunt. Gebruik `messages` of `verbose`
voor LSP-tracering; opstartfouten worden naar het **Forge Web Script geschreven
Language Server**-uitvoerkanaal en weergegeven als een editorfout.

Voor lokale ontwikkeling vanuit deze repository:

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
```

Bij de build wordt eerst het gedeelde LSP-pakket gebouwd en vervolgens het toegangspunt gefaseerd
en runtime-afhankelijkheden onder `extensions/fws-vscode/server`. `package`
produceert `extensions/fws-vscode/fws-vscode-0.1.0.vsix`; ontwikkelingsbronnen
en testbestanden worden uitgesloten door `.vscodeignore`. De verpakte rookcontrole
initialiseert de geënsceneerde server en verifieert de geadverteerde voltooiing, zweeft,
semantisch token en stabiel diagnostisch gedrag.

### IntelliJ IDEE / LSP4IJ

Bouw de plug-in ZIP en installeer deze via **Instellingen | Plug-ins | Uitrusting |
Installeer plug-in vanaf schijf**:

```sh
cd extensions/fws-ij
JAVA_HOME=/path/to/jdk-23 ./gradlew test verifyPlugin buildPlugin --no-daemon --offline
```

De resulterende `build/distributions/fws-ij-0.1.0.zip` bevat het dunne
LSP4IJ-integratie. De plug-in compileert tegen de IntelliJ IDEA Community
2024.3.3 (build 243), behoudt een open compatibiliteitsbereik vanaf build
243 en hoger, en is geverifieerd tegen WebStorm 2026.2.1 (tak 262, inclusief
`WS-262.9437.145`). Het pint LSP4IJ 0.20.1 en bundelt Node.js of de
taal server. Start de IDE opnieuw op na de installatie als dit niet onmiddellijk gebeurt
herkent `.fws`-bestanden.

De plug-in wijst `*.fws` toe aan taal-ID `fws` en start een gedeelde stdio
server voor het project. IntelliJ-configuratie wordt exclusief geleverd door
**Instellingen | Gereedschap | Webscript smeden**; er is geen projectscript of Flora
configuratie pad. Configureer:

- **Node.js uitvoerbaar** — Node 24 of nieuwer; standaard ingesteld op `node`.
- **Taalserveropdracht/pad** — standaard ingesteld op `forge-web-script-lsp` en
  lost een project `node_modules/.bin`-installatie op (inclusief parent
  werkruimtewortels) of `PATH`. Een expliciet JavaScript-ingangspunt zoals
  `node_modules/@mission-platform/forge-web-script-lsp/dist/main.js` is dat ook
  ondersteund.
- **Serverargumenten** — optionele argumenten tussen aanhalingstekens die worden doorgegeven aan de server.
- **LSP-trace** — `off`, `messages` of `verbose`.
- **Start de taalserver wanneer een FWS-bestand wordt geopend** — opstartschakelaar.

Voor een project-lokale CLI installeert u de server in het project dat door IntelliJ is geopend:

```sh
pnpm add -D @mission-platform/forge-web-script-lsp
```

De plug-in gebruikt de IntelliJ-projectroot als proceswerkmap.
LSP4IJ levert de documentlevenscyclus en werkruimtemeldingen; de
de root-begrensde host van de server voert bestandsopsomming uit, bewaakt bestand
invalidatie en alle taalanalyses. Dezelfde verpakte instellingenstatus is
gebruikt door zowel het LSP-opstartprogramma als de generieke stdio DAP-adapter.

### Validatie door meerdere editors

Voer de gedeelde taalservice/LSP-controles en beide clientpijplijnen uit vanuit de
hoofdmap van de opslagplaats. Voor de IntelliJ-opdrachten is een JDK vereist die wordt ondersteund door de vastgezette
Gradle/IntelliJ-toolchain; het volgende is een voorbeeld voor macOS:

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

De staged-server- en IntelliJ-rooktests voeren dezelfde initialisatie uit,
diagnostisch, voltooiing, hover, semantisch token, afsluiten en projectroot
lanceringscontract. De gedeelde LSP-tests omvatten bovendien de werkruimtemap
doorsturen, `file:` URI-afhandeling, root-contained gecontroleerde bestandsinvalidatie,
stabiele diagnostische codes/bereiken en verwijdering. Editor-klanten moeten blootleggen
alleen de functies die door de server worden geadverteerd; go-to-definitie, referenties,
hernoemen, opmaak, codeacties en taalimporten tussen bestanden blijven bestaan
niet ondersteund.

### Problemen oplossen

- **Node runtime afgewezen:** voer `<configured-node> --version` uit en selecteer een
  Node 24+ uitvoerbaar in de relevante VS Code- of IntelliJ-instelling. De klant
  rapporteert de gedetecteerde versie en valt niet stilletjes terug naar een oudere versie
  looptijd.
- **VS Code-verpakte server ontbreekt:** opnieuw opgebouwd met
  `pnpm exec turbo run build --filter=fws-vscode`, bevestig
  `extensions/fws-vscode/server/dist/main.js` bestaat of is ingesteld
  `forgeWebScript.serverPath` naar een geldig gebouwd toegangspunt. Inspecteer de
  **Forge Web Script Language Server**-uitvoerkanaal met tracering ingeschakeld.
- **IntelliJ-serveropdracht niet gevonden:** installeren
  `@mission-platform/forge-web-script-lsp` in het geopende project, zorg ervoor dat dit het geval is
  `node_modules/.bin` aanwezig is, of configureer een expliciete opdracht/pad. De
  plugin rapporteert de gezochte projectroot en het voorgestelde installatiepad.
- **Geen diagnose of voltooiing:** controleer of het bestand de naam `.fws` heeft, de
  client is ingeschakeld en de werkruimte heeft een projecthoofdmap. Controleer de klant
  traceer/uitvoerkanaal en bevestig dat de server de `file:`-werkruimte heeft ontvangen
  mappen; zonder root kunnen alleen reeds geopende documenten worden weergegeven.
- **Onverwachte editorfuncties:** deze integraties doen dat opzettelijk niet
  voeg parser of semantische logica toe. Vergelijk mogelijkheden en stabiele `FWS-*`
  diagnostische codes met dit document en het gedeelde LSP-pakket in plaats van
  editorspecifiek gedrag toevoegen.

De client moet werkruimtemappen verzenden als `file:`-URI's, indien ondersteund. De
server gebruikt eerst werkruimtemappen en valt terug op `rootUri`; als geen van beide dat is
op voorwaarde dat de host van het bestandssysteem geen wortels heeft en alleen al geopend kan zijn
documenten.

## Gedrag en beveiliging van de werkruimte

De Node-server creëert een door het bestandssysteem ondersteunde werkruimtehost vanaf de basis
het LSP-initialisatieverzoek. Het somt recursief de bestanden daaronder op
rooten, leest bestanden die nodig zijn voor de analyse van de werkruimte en kijkt naar de root-inhoud
bestandswijzigingen. Paden worden gecanoniseerd en symlinks worden opgelost voordat ze worden gelezen;
een toegang buiten elke geconfigureerde root wordt afgewezen. Niet-ondersteunde URI-schema's
worden niet behandeld als bestandssysteempaden.

De identiteit van de werkruimte is op URI gebaseerd. Twee documenten met dezelfde basisnaam maar
verschillende URI's blijven afzonderlijke documenten en cache-items. Het sluiten van een
document verwijdert zijn diagnostische gegevens van de client. Creëren, veranderen, of
Als u een bewaakt bestand verwijdert, wordt de werkruimteafhankelijke analyse ongeldig en wordt het bestand opnieuw gepubliceerd
diagnostiek voor geopende documenten.

De server introduceert geen projectconfiguratiebestand. De standaard CLI
biedt momenteel lege werkruimte-opties, tenzij een host door code wordt geïnjecteerd.
Het taalservicewerkplekcontract luidt:

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

`requestedCapabilities` en `requireExports` worden doorgegeven
`validateForgeWebScript`. Een mogelijkhedenimport die niet is toegestaan door de
werkruimte produceert de stabiele ABI-diagnostiek `FWS-ABI-002`; exportgerelateerd
vereisten gebruiken het overeenkomstige `FWS-ABI-003`-contract. Namen van mogelijkheden
en handtekeningen voeden ook voltooiing en zweven, maar worden nooit afgeleid
ambient Node of browser-API's.

### Exportbeleid van de editor

Editor-analyse is standaard tolerant ten aanzien van module-privéfuncties. Wanneer
`requireExports` wordt weggelaten uit de standaard LSP-host, een geïnjecteerde werkruimte
host, of een Monaco-werkruimtehost, wordt behandeld als `false`, dus een privéhelper
kan door een andere functie in dezelfde module worden aangeroepen zonder te produceren
`FWS-ABI-003`. Privéfuncties blijven beschikbaar voor symbolen van dezelfde module,
voltooiing, zweven en oproep/type-resolutie, maar het zijn geen Wasm ABI-exports.

Hosts die alleen-ABI-diagnostiek willen, kunnen `requireExports: true` globaal instellen of
voor een document via `optionsForUri`; dat beleid te veranderen en het beleid te vernieuwen
werkruimte maakt de in de cache opgeslagen analyse ongeldig. Het instellen van `requireExports: false` is een
expliciet tolerant beleid. Deze editorstandaard verandert niets aan de compilatie:
`@mission-platform/forge-web-script` blijft `export fn` vereisen voor elke
compiler ABI-functie wanneer de `requireExports`-optie is weggelaten.

Wanneer u de kern of een programmatisch gemaakte LSP-server gebruikt, belt u
`refreshWorkspace(uri)` na het openen van een document en voordat u erop vertrouwt
van de werkruimte afgeleide diagnostiek, voltooiing of hover. De LSP-adapter presteert
deze vernieuwing voordat diagnostische gegevens worden gepubliceerd en vóór voltooiing of
hover verzoeken.

## Diagnostiek en bereiken

Diagnostiek behoudt de stabiele `code`, ernst, fase, bericht,
bestandsnaam, bronbereik en optionele hint. De LSP-weergave gebruikt de
standaard nul-gebaseerde `Position` en half-open `Range`; tekenverschuivingen tellen mee
UTF-16-code-eenheden, inclusief wanneer Unicode vóór de diagnose verschijnt.

De LSP-server publiceert `source: "forge-web-script"`. De fase en hint zijn
ook opgenomen in het diagnostische `data`-object. Typische stabiele codefamilies
zijn:

| Codeer familie | Fase         | Betekenis                                                                                                       |
| -------------- | ------------ | --------------------------------------------------------------------------------------------------------------- |
| `FWS-LEX-*`    | `lex`        | Ongeldige tekens/escapes, onbewerkte tekenreeksregelbeëindigers of niet-afgesloten tekenreeksen/blokopmerkingen |
| `FWS-PARSE-*`  | `parse`      | Ongeldige syntaxis van module, declaratie, instructie of expressie                                              |
| `FWS-TYPE-*`   | `type-check` | Ongeldige typen, namen, operators, argumenten of retourneert                                                    |
| `FWS-ABI-*`    | `abi`        | Dubbele namen, geweigerde mogelijkheden, export of import                                                       |

Misvormde invoer wordt nog steeds getokeniseerd en geanalyseerd waar parserherstel dit mogelijk maakt
het. Een verkeerd opgemaakte bron kan bijvoorbeeld `FWS-PARSE-017` produceren terwijl deze behouden blijft
bruikbare lexicale tokens en gedeeltelijke symboolinformatie. Klanten moeten zich laten zien
het opgegeven bereik en de opgegeven code in plaats van overeenkomende diagnostische tekst.

String-lexing accepteert alleen JSON-compatibele escapes (`\\`, `\"`, `\/`, `\b`,
`\f`, `\n`, `\r`, `\t` en `\uXXXX`). Ruwe lijnterminators, ongeldige ontsnappingen,
en achterliggende backslashes produceren lexicale diagnostiek (`FWS-LEX-004` of
`FWS-LEX-005`). Lexer- en diagnostische overspanningen worden begrensd door de bronlengte;
klanten kunnen ze veilig rechtstreeks converteren naar UTF-16 LSP-reeksen.

## De Monaco-adapter inbedden

De browseradapter wordt geëxporteerd door `@mission-platform/content` en bevindt zich in
`packages/content/src/monaco/forge-web-script.ts`. `ForgeMonacoEditor` geladen
de adapter lui wanneer `language="fws"`; Monaco blijft een type-only import
de synchrone componentengrafiek, dus de weergave op de server wordt niet geëvalueerd
Monaco.

Het eenvoudigste componentgebruik is:

```tsx
<ForgeMonacoEditor
  language="fws"
  modelValue={'export fn add(value: i32) -> i32 {\n  return value + 1;\n}'}
/>
```

Stel `forgeWebScript={false}` in om de automatische integratie uit te schakelen. Anders,
de component registreert de `fws`-taal en de `.fws`-extensie, gebruikt Monaco's
ingebouwde tokencategorieën voor thema's (`keyword`, `type`, `string`, `comment`,
`number`, `operator`, `delimiter` en `invalid`), synchroniseert de actieve
model, publiceert markeringen en registreert voltooiings- en hoverproviders.

Voor capaciteitsbewuste browsertools geeft u een werkruimteobject op dat eigendom is van de host:

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

De host wordt opzettelijk geïnjecteerd: browserconsumenten moeten lees-,
bestandsopsomming, projectopties en optionele wijzigingsmeldingen van
hun eigen opslag- of applicatiestatus. De adapter gaat nooit uit van Node
bestandssysteem-API's en maakt geen verbinding met de stdio-server. Gooi het geretourneerde weg
adapterhandvat (of `ForgeMonacoEditor` ontkoppelen) om modelluisteraars te verwijderen,
providers, markers en servicecaches.

Voor imperatieve integratie gebruikt u dezelfde adapter direct nadat Monaco dat heeft gedaan
geladen:

```ts
import { attachForgeWebScriptMonaco, registerForgeWebScriptLanguage } from '@mission-platform/content';

registerForgeWebScriptLanguage(monaco);
const handle = attachForgeWebScriptMonaco(editor, monaco, { workspaceHost });

await handle.refresh();
// On editor teardown:
handle.dispose();
```

`registerForgeWebScriptLanguage` kan veilig worden aangeroepen als `fws` dat al is
geregistreerd. De registratiehandgreep beschikt over tokenproviders; de adapter
handvat beschikt bovendien over voltooiings-/zweefproviders, modelluisteraars,
markers en het eigen taalservice-exemplaar.

## LSP versus browserwerkruimten

| Consument       | Implementatie van de werkplek                              | Root-/beveiligingsgrens                                                                              | Vervoer          |
| --------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------- |
| Node LSP-client | `RootBoundedForgeWebScriptWorkspaceHost`                   | Gecanoniseerde geconfigureerde bestandssysteemwortels; externe lezingen worden afgewezen             | stdio LSP        |
| Monaco/browser  | Door de applicatie geleverde `ForgeWebScriptWorkspaceHost` | De host beslist welke URI's/bestanden/opties beschikbaar worden gesteld; geen bestandssysteemaanname | In-procesadapter |

Beide adapters gebruiken dezelfde taalservicecontracten en analysesemantiek,
maar ze delen geen documentenopslag of -transport. Een browserhost mag dat niet
geef Node bestandssysteemfuncties door aan een browserbundel. Omgekeerd de Node LSP
server moet worden gebruikt voor externe clients in plaats van te proberen de server uit te voeren
bestandssysteemhost in Monaco.

## Validatie en conformiteit

De taalservice- en LSP-pakketten bevatten tests voor geaccepteerd en afgewezen
bootstrap-armaturen, diagnostische codes en UTF-16-bereiken, verkeerd gevormde invoer,
ongeldig maken van de werkruimte, rootisolatie, LSP-synchronisatie, voltooiing,
zweven en afvoeren. Het inhoudspakket bevat een adapter, markering,
marker, provider, verwijdering en dekking van SSR/niet-Forge-editor.

Voer de gerichte controles uit vanuit de root van de repository:

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

Lint- en formaatopdrachten voor inhoud voor het hele pakket inspecteren ook niet-gerelateerde CSS/SCSS
bestanden; een fout die beperkt is tot die bestaande bestanden is geen Forge Web Script
taal-tooling regressie. De gezaghebbende taal is een vast onderdeel van de verwachtingen
blijven in `../../../forge-web-script/src/fixtures/bootstrap.ts` en de
[taalreferentie](../../../../../forge-web-script/docs/locales/nl/reference/language.md).
