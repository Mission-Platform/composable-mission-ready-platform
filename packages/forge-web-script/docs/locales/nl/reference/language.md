# Forge WebScript v1

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/forge-web-script/docs/reference/language.md: [packages/forge-web-script/docs/reference/language.md](../../../reference/language.md)
> Taal: Nederlands (nl)

Forge Web Script (`.fws`) is een kleine, algemene taal voor WebAssembly
werkdruk. Het is web-first, op mogelijkheden gebaseerd en doelbewust onafhankelijk van
Vue, React, de DOM en de Forge-componentcompiler. Dit document is de
gezaghebbend v1 taal- en modulecontract. `@mission-platform/forge-web-script`
is de browserveilige compatibiliteitsgevel voor parseren, typecontrole, grafiek/link
resolutie, manifestgegevens en de compilerservice-API die wordt gebruikt door de Vite-adapter
en LSP. `@mission-platform/forge-web-script-wasm` is de deterministische backend
dat de gecontroleerde IR verlaagt tot gevalideerde WebAssembly en WAT. Alleen de Node
Het `@mission-platform/forge-web-script-cli`-pakket bevat de `forge-web-script`
commando voor het controleren en compileren van bestanden of brongrafieken. De TypeScript
het pakket bevat ook de uitvoerbare conformiteitsarmaturen.

## Status en versiebeheer

Het huidige contract is **taalversie `1.0`** en **logische ABI-versie
`1.2`**. De taalversie beschrijft bron en semantiek; de ABI-versie
beschrijft de WebAssembly-grens en het hostprotocol. Ze zijn in versievorm
zelfstandig. Een compiler moet beide versies in elke gegenereerde module schrijven
manifest, en een lader moet beide valideren vóór instantiatie. ABI `1.2` is een
breken van de herziening van het geheugencontract: `memory`-manifesten moeten worden gedeclareerd
`allocatorExport: "fws_alloc"`, `deallocatorExport: "fws_dealloc"` en
`reallocatorExport: "fws_realloc"`, terwijl `fws_reset` aanwezig moet zijn in het
module-exportset. Laders weigeren oudere of onvolledige manifesten en modules
in plaats van stilzwijgend de ontbrekende hertoewijzing aan te nemen.

Het bronformaat is UTF-8-tekst met de extensie `.fws`. Een bronbestand is een
bestand-gedefinieerde module; de identiteit is afgeleid van de genormaliseerde Vite-bestands-ID
(of werkruimte-relatief pad). De compilerinvoer identificeert de taalversie, terwijl de
het gegenereerde manifest is de persistente versiemarkering die door laders wordt gebruikt. Toekomst
herzieningen kunnen een bronpragma toevoegen, maar v1 vereist er geen; een v1-compiler
moet een bronconstructie die hij niet begrijpt verwerpen, in plaats van de bron te raden
versie.

## Bronanalyse en releasebeleid

Het kernpakket bevat één analysecontract voor de compiler, taal
service-, CLI- en MCP-integraties. `analyzeForgeWebScript` accepteert de aangevinkte
frontend-resultaat en optionele geregistreerde regels, en retourneert vervolgens feiten, bevindingen en
dezelfde stabiele diagnostiek die door de rest van de compiler wordt gebruikt. Analysecontext
omvat bronbestanden, optionele bronkaartvermeldingen, onbewerkte en geoptimaliseerde IR, de
ABI-manifest, metadata van grafieken/links, het doelprofiel en genormaliseerd beleid.

Analysebevindingen gebruiken stabiele `FWS-ANALYSIS-*`-codes en omvatten een categorie,
ernst, UTF-16-compatibele bronreeks, bewijsmateriaal, herstelhint en
optionele OWASP/CWE-referenties. Hun diagnostiek voegt `phase: "analysis"` toe en
beveiligingsmetagegevens zonder de bestaande `FWS-LEX-*`, `FWS-PARSE-*` te wijzigen,
`FWS-TYPE-*`- of `FWS-ABI-*`-diagnostiek.

Bij het compileren wordt standaard het strikte profiel gebruikt. In de strikte modus: fouternst
bevindingen (of bevindingen die expliciet zijn gemarkeerd als `blocking`) voorkomen Wasm- en ESM-uitvoer;
het volledige rapport blijft beschikbaar over het geretourneerde artefact. De ontwikkeling
profiel is bedoeld voor redacteurs- en onderzoeksworkflows: het rapporteert bevindingen
maar gebruikt ze niet als vrijgavepoort. Beleid omvat een expliciete mogelijkheid
toelatingslijst en begrensde limieten voor bevindingen, oproepdiepte, lussen, toewijzingen, async
taken en invoer van reguliere expressies.

Cachesleutels van de compilerservice omvatten het genormaliseerde analysebeleid, geregistreerd
regel-ID's en bronkaartinvoer. Het wijzigen van een van deze analyse-invoer
kan daarom een artefact dat onder een ander beleid is geproduceerd, niet hergebruiken.

## Uitzonderingsvrije resultaten en gestructureerde controlestroom

Forge Web Script vertegenwoordigt herstelbare resultaten met de standaardbibliotheek
`Option<T>` en `Result<T, E>` opsommingen. Gebruik `match` om elke variant af te handelen;
`throw`, `try` en `catch` op bronniveau zijn geen uitvoerbare constructies. De
gestructureerde `for`-, `while`- en `do while`-formulieren zijn uitvoerbare v1-besturingsstromen;
het zijn geen uitzonderings- of iteratorconstructies. `Result` heeft precies de
varianten `Ok(T)` en `Error(E)`.

Iteratorfuncties gebruiken `iter fn`, retourneren `Iterator<T>` en onderbreken bij `yield`:

```fws
export iter fn forward(source: Iterator<i32>) -> Iterator<i32> {
  loop value = source.next() { yield value; }
}
```

De compiler maakt een iterator-export beschikbaar via een JavaScript-compatibel bestand
`next()`-adapter. Elke aanroep retourneert `{ value, done: false }` voor een waarde en
`{ value: undefined, done: true }` bij voltooiing; daaropvolgende oproepen blijven bestaan
compleet. `Iterator<T>.next()` wordt getypt als `Option<T>`, dus geketende iteratoren
moet het elementtype en het eigendomscontract behouden.

## Optimalisatie en doelprofielen

Release-optimalisatie kan beproefde iterator-afrol, pure-call inlining, toepassen
tail-call-analyse en veilig voorwaardelijk vouwen. Gebruik de richtlijn `noinline`
wanneer een functiegrens zichtbaar moet blijven. Mogelijkheid tot importeren en loggen
zijn waarneembare bijwerkingen en worden niet opnieuw geordend. Doelfuncties zijn opt-in
compileer invoer en worden vastgelegd in het ABI-manifest en de cachesleutel:

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

`threads` en `atomics` moeten beide zijn ingeschakeld voor atomaire uitvoer met gedeeld geheugen;
niet-ondersteunde combinaties produceren diagnostiek. Een memory64-manifest maakt gebruik van `u64`
adressen en pointer-length-u64-waarden. In de foutopsporingsmodus kan een geconfigureerde cache dat wel doen
volharden in deterministische `<key>.optimized.wat`, `<key>.unoptimized.wat`,
`<key>.optimized.wasm`- en `<key>.unoptimized.wasm`-artefacten. Cache schrijft
zijn additief en niet beschikbaar of falende caches mislukken niet bij het compileren.

## Linkprofielen voor meerdere projecten

FWS ondersteunt twee primaire linkprofielen voor projectoverschrijdend afhankelijkheidsbeheer:

- `linkProfile: "static"`: projectoverschrijdende modules worden tot één geheel samengevoegd
  scannergrafiekartefact. Dit maakt agressieve statische optimalisatie mogelijk
  (`static-aggressive`-profiel) en elimineert het opzoeken van runtime-modules in het
  kosten van artefactgrootte.
- `linkProfile: "dynamic"`: Expliciete grenzen van bronmodules blijven behouden.
  `ForgeWebScriptDynamicLinkCache` wordt gebruikt om decodermodules tijdens runtime op te lossen,
  met in de cache opgeslagen functieadressen gecodeerd door artefact en manifeste identiteit. Dit
  gebruikt het `dynamic-conservative`-optimalisatieprofiel, wat veiliger is
  modulaire distributies.

## Lexicale verwijzing

De canonieke ingecheckte grammatica is
[`src/grammar/forge-web-script.ebnf`](../../../../src/grammar/forge-web-script.ebnf).
De onderstaande lexicale en parsersamenvattingen leggen het publieke v1-contract uit; de
EBNF-artefact is gezaghebbend wanneer een implementatiedetail dubbelzinnig is.

Witruimte is onbelangrijk, behalve binnen tekenreeksen. `//` start een opmerking die
loopt tot het einde van de lijn. `/*` start een blokcommentaar dat eindigt bij de volgende
`*/`; blokopmerkingen kunnen regels omvatten. Opmerkingen zijn trivia en komen niet in de
grammatica. ID's beginnen met `A-Z`, `a-z` of `_`, en
ga verder met die tekens of decimale cijfers. Identificatiegegevens zijn
hoofdlettergevoelig. Gehele getallen zijn niet-negatieve decimale reeksen; v1 wel
accepteert geen letterlijke hexadecimale, octale of drijvende-kommasyntaxis in de
bootstrap-subset. Tekenreeksen gebruiken dubbele aanhalingstekens en alleen JSON-compatibele escapes:
`\\`, `\"`, `\/`, `\b`, `\f`, `\n`, `\r`, `\t` en `\uXXXX` met precies
vier hexadecimale cijfers. Ruwe regelterminators en ongeldige ontsnappingen zijn lexicaal
fouten; gebruik in plaats daarvan `\n` of `\r`. Tekenreekswaarden zijn UTF-8-waarden.

De gereserveerde woorden zijn `as`, `capability`, `case`, `catch`, `class`,
`constructor`, `default`, `do`, `else`, `enum`, `extends`, `export`, `for`,
`fn`, `if`, `impl`, `import`, `inline`, `interface`, `iter`, `let`, `likely`,
`loop`, `match`, `module`, `new`, `noinline`, `return`, `struct`, `switch`,
`throw`, `trait`, `try`, `unlikely`, `while` en `yield`. `true` en `false`
zijn booleaanse letterlijke waarden. Interpunctie wel
`{ } ( ) [ ] : ; , | .`; exploitanten zijn
`! % * + - / < <= == != > >= && || = -> => ::`.

Elke diagnosereeks is een half-open bron-offsetbereik `[start, end)` in de
originele UTF-16 TypeScript-reeks (offsets tellen UTF-16-code-eenheden), met
één-gebaseerde lijn- en kolomvelden. De
bootstrap-implementatie rapporteert offsets en lijn-/kolomgegevens samen, zodat
De Vite-adapter kan bron-toegewezen diagnostiek produceren zonder reparsing.

De scanner bewaart opmerkingen als `comment`-tokens, zodat documentatie-opmerkingen mogelijk zijn
gekoppeld zijn aan functies, terwijl parserbeslissingen alle trivia overslaan. Exploitanten
met gedeelde voorvoegsels worden geselecteerd op basis van de langste overeenkomst. Bij verkeerd opgemaakte invoer wordt het
scanner verbruikt een begrensd gebied, zendt de stabiele `FWS-LEX-*`-diagnose uit, en
gaat door naar een enkel EOF-token; dit herstelgedrag maakt deel uit van de grammatica
contract. De TypeScript frontend meet alle offsets in UTF-16-code-eenheden;
zelf-gehoste bytefasen moeten UTF-8-bytereeksen converteren voordat ze de
gedeeld tokencontract.

### Opmerkingen over de functiedocumentatie

Een blokcommentaar waarvan het openingsscheidingsteken `/**` is, is een documentatiecommentaar.
Het wordt toegevoegd aan de volgende `fn`- of `export fn`-declaratie op het hoogste niveau als
Witruimte en gewone opmerkingen komen voor tussen het commentaar en de declaratie:

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

Documentatieopmerkingen vóór het importeren van mogelijkheden, bronimporten, structuren,
enums, interfaces of andere niet-functiedeclaraties worden weggegooid. Dat doen ze
niet overdragen naar een latere functie. Als er meerdere documentatieopmerkingen voorkomen
vóór één aangifte wordt het dichtstbijzijnde (laatste) documentatiecommentaar gebruikt;
gewone `//`- en `/* ... */`-opmerkingen vervangen dit niet. Documentatie is
alleen erkend op het hoogste niveau; opmerkingen binnen functielichamen zijn dat niet
functie-metagegevens. Een niet-beëindigd blokcommentaar produceert het stabiele lexicale
diagnostische `FWS-LEX-003` en parserherstel blijven beschikbaar voor de rest van de periode
de bron.

De genormaliseerde AST-metagegevens hebben deze vorm:

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

De normalisatie verwijdert de scheidingstekens `/**` en `*/`, leidende witruimte, de
optionele leidende `*`-decoratie op elke regel en omringende witruimte. Loopt
van witruimte samenvouwen tot één spatie. Beschrijvingsregels vóór de eerste tag
zijn gegroepeerd in paragrafen; lege regels blijven alinea-einden. Er begint een label
op een regel die begint met `@`, en de niet-lege volgende regels vervolgen de
vorige label. Tagvolgorde en dubbele tags blijven behouden.

De veelgebruikte tagvormen zijn:

| Tagformulier                                            | Gestructureerde velden                 |
| ------------------------------------------------------- | -------------------------------------- |
| `@param name text`, `@arg`, `@argument` of `@parameter` | `name` is `subject`; de rest is `text` |
| `@typeparam name text`                                  | `name` is `subject`; de rest is `text` |
| `@throws type text` of `@exception type text`           | `type` is `subject`; de rest is `text` |
| `@return text` of `@returns text`                       | Alleen `text`                          |
| `@deprecated text`                                      | Alleen `text`                          |

Andere `@name`-formulieren worden geaccepteerd en bewaard als bestelde tags in plaats van
gerapporteerd als diagnostiek. Ze hebben geen afgeleid onderwerp; hun resterende tekst
wordt bewaard. Tagnamen zijn hoofdlettergevoelig.

Voor editorconsumenten worden dezelfde metadata deterministisch weergegeven als de
beschrijving gevolgd door elke tag in bronvolgorde, met lege regels ertussen
onderdelen. Er wordt een onderwerp weergegeven tussen de tagnaam en de tekst ervan, bijvoorbeeld:

```text
Adds one to a value.

@param value The value to increment.

@return The incremented value.

@deprecated Use `increment` in new code.
```

Documentatie bestaat uit analyse-metagegevens, en niet uit uitvoerbare taalsemantiek. Het mag
worden bewaard in de AST en IR voor consumenten van taaldiensten, maar dat is niet het geval
invloed hebben op het parseren van declaraties, typecontrole, verlaging of runtime-gedrag.
Documentatie is uitgesloten van de gegenereerde ABI-handtekeningen en manifesten
declaraties en loader-artefacten, Wasm/WAT, hashes van uitvoerbare inhoud, en
capaciteitsvereisten. Het wijzigen van alleen een documentatieopmerking is daarom wel het geval
wijzig de ABI van de module of het gegenereerde uitvoerbare contract niet.

## Bron grammatica

Het hierboven gekoppelde ingecheckte EBNF-artefact beschrijft de volledige lexicale,
bootstrap, uitgebreid aggregaat en herstelcontract. Het volgende fragment
beschrijft het v1-bootstrapoppervlak voor lezers die niet het volledige bestand nodig hebben.
De grammatica gebruikt `*` en `?` in de gebruikelijke EBNF-zin:

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

Binaire operatoren volgen deze prioriteitsniveaus, van sterk naar zwak:
`* / %`, `+ -`, geordende vergelijkingen, gelijkheid, `&&` en `||`. Exploitanten zijn
links-associatief. Expressies tussen haakjes zijn gereserveerd voor de volgende bootstrap
revisie; een compiler moet een parse-diagnostiek uitvoeren in plaats van stil
aanvaard ze vandaag.

Dit fragment is de **bootstrap**-grammatica. Het omvat bestandsgedefinieerde modules,
capaciteit/bronimport, primitieve handtekeningen, oproepen, lokale waarden,
expressies, gestructureerd `if`/`else`, `while`, C-stijl `for`, `do while` en
`return`. De lusvormen maken deel uit van het uitvoerbare bootstrapcontract; alleen
de gereserveerde uitzonderingswoorden `throw`, `try` en `catch` worden afgewezen als
uitvoerbare constructies. Geaggregeerde verklaringen en waarden hieronder zijn de
**verlengd** contract en mag niet worden behandeld als een alternatieve spelling voor
de bootstrapgrammatica.

### Uitgebreide geaggregeerde grammatica

Het uitgebreide contract voegt onveranderlijke structuren, getagde enums, generieke typen,
interfaces, functiewaarden, verzamelingsliterals, indexering en `match`.
Hun kernbronvormen zijn:

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

Gekwalificeerde constructeurs zoals `Result::Ok(value)` en
`Result::Error(message)` wordt omgezet in de aggregatie- en valideringsvariant
ariteit en veldtypen. De standaard `Result<T, E>`-varianten zijn precies
`Ok(T)` en `Error(E)`; `Option<T>` blijft `Some(T)` en `None`. Een functie
waarde gebruikt bijvoorbeeld `fn name` en een gedeclareerd `Fn<parameter, result>`-type
`let callback: Fn<i32, i32> = fn increment;`. Functiewaarden worden gecontroleerd door
de functiesignatuur waarnaar wordt verwezen en zijn alleen opvraagbaar met overeenkomende ariteit
en argumenttypen.

Match-bindingen zijn lokaal voor hun arm: `Result::Ok(item) => item` bindt
`item` terwijl u alleen die expressie controleert. Bindende namen moeten uniek zijn in een
arm en hun telling moeten overeenkomen met de geselecteerde variantvelden; ze lekken niet
aan broers en zussen of de omringende functie.

## Typen en semantiek

V1 heeft de primitieve typen `bool`, ondertekend `i32`/`i64`, niet-ondertekend `u32`/`u64`,
`f32`/`f64`, `string`, `bytes` en `unit`. Er zijn geen impliciete numerieke waarden
conversies. Rekenkundige operanden moeten van hetzelfde numerieke type zijn; vergelijkingen
produceren `bool`; logische operators vereisen `bool`; gelijkheid vereist gelijkheid
typen. Een functie heeft één gedeclareerd resultaattype en de functie `unit` retourneert
zonder waarde.

### Reguliere expressies die eigendom zijn van de compiler

Forge Web Script biedt een deterministische standaardbibliotheek met reguliere expressies.
De oproepen `regex_full_match(pattern, value) -> bool`,
`regex_prefix_match(pattern, value) -> bool`, en
`regex_search(pattern, value, start: i32) -> bool` voert gehele waarde uit,
respectievelijk positie-nul voorvoegsel en meest linkse zoekopdracht. Grenzen vastleggen
zijn beschikbaar via de overeenkomstige `regex_*_capture_start` en
`regex_*_capture_end`-oproepen; ze nemen een groepsindex en retourneren een UTF-16-tekenreeks
offset of `-1` wanneer er geen overeenkomst is of de groep is uitgeschakeld. Zoek opname
oproepen nemen bovendien de startoffset vóór de groepsindex.

Regex-aanroepen zijn standaardbibliotheekfuncties die eigendom zijn van de compiler. Ze zijn getypt door
de frontend, geannoteerd in IR, en zijn nooit importmogelijkheden. Een module die gebruik maakt van
alleen regex-aanroepen hebben daarom een lege `imports`-array en een lege
`requiredCapabilities`-array. Backend-verlaging en de in-module VM zijn a
aparte implementatiefase; een compiler mag deze aanroepen niet vervangen door a
browser `RegExp`, Node API of impliciete hostimport.

De ondersteunde syntaxis is opzettelijk beperkt tot letterlijke tekens, `.`, teken
klassen en bereiken (inclusief `^`-ontkenning), `\d`, `\D`, `\w`, `\W`, `\s`,
`\S`, ontsnapte letterlijke waarden, groepen vastleggen en niet vastleggen, afwisseling,
`*`, `+`, `?`, begrensde `{n}`, `{n,}`, `{n,m}` kwantoren, luie kwantoren,
en `^`/`Forge Web Script biedt een deterministische standaardbibliotheek met reguliere expressies.
De oproepen`regex_full_match(pattern, value) -> bool`,
`regex_prefix_match(pattern, value) -> bool`, en
`regex_search(pattern, value, start: i32) -> bool`voert gehele waarde uit,
respectievelijk positie-nul voorvoegsel en meest linkse zoekopdracht. Grenzen vastleggen
zijn beschikbaar via de overeenkomstige`regex__*capture_start`en`regex*__capture_end`-oproepen; ze nemen een groepsindex en retourneren een UTF-16-tekenreeks
offset of `-1` wanneer er geen overeenkomst is of de groep is uitgeschakeld. Zoek opname
oproepen nemen bovendien de startoffset vóór de groepsindex.

Regex-aanroepen zijn standaardbibliotheekfuncties die eigendom zijn van de compiler. Ze zijn getypt door
de frontend, geannoteerd in IR, en zijn nooit importmogelijkheden. Een module die gebruik maakt van
alleen regex-aanroepen hebben daarom een lege `imports`-array en een lege
`requiredCapabilities`-array. Backend-verlaging en de in-module VM zijn a
aparte implementatiefase; een compiler mag deze aanroepen niet vervangen door a
browser `RegExp`, Node API of impliciete hostimport.

De ondersteunde syntaxis is opzettelijk beperkt tot letterlijke tekens, `.`, teken
klassen en bereiken (inclusief `^`-ontkenning), `\d`, `\D`, `\w`, `\W`, `\s`,
`\S`, ontsnapte letterlijke waarden, groepen vastleggen en niet vastleggen, afwisseling,
`*`, `+`, `?`, begrensde `{n}`, `{n,}`, `{n,m}` kwantoren, luie kwantoren,
en `^`/ ankers. Terugverwijzingen, rondkijken, benoemde groepen, vlaggen en
andere host-engine-extensies worden afgewezen. Niet-ondersteunde syntaxis heeft de eigenschap stable
`FWS-REGEX-001` diagnostisch; misvormde patronen gebruiken `FWS-REGEX-002`, en een
interne compiler-invariante fout maakt gebruik van `FWS-REGEX-003`.

Het gedeelde pakket `@mission-platform/forge-web-script-regex` is eigenaar van de stal `$`
bytecode (`FORGE_REGEX_BYTECODE_VERSION`) en build-time compiler. Het is expliciet
`/reference`-ingangspunt stelt een TypeScript-VM alleen beschikbaar als conformiteitsorakel
voor differentiële tests met native engine en backend; de pakketroot niet
stel die VM bloot. Telefoonspecifieke metagegevens blijven in het telefoonnummerpakket aanwezig.
Uitvoering van productieregex behoort tot de Forge Web Script-backend en de
gegenereerde WASM-module, nooit naar een TypeScript runtimelaag of hostmogelijkheid.

`string` en `bytes` zijn de v1-aggregaatwaarden. Een string is onveranderlijk
reeks scalaire Unicode-waarden weergegeven als UTF-8 op de ABI-grens.
Bytes zijn een onveranderlijke reeks octetten en kunnen elke waarde bevatten
`0x00` tot en met `0xff`. Hun activiteiten op bronniveau zijn opzettelijk klein
in de bootstrap-subset; hostoproepen en latere standaardbibliotheekmodules bieden
coderings-, slice- en verzamelbewerkingen zonder toevoeging van een omgevingsbrowser
API's voor de taal.

### Verzameling handtekeningen

Het uitgebreide incassocontract is structureel en ontvangersgericht; dat doet het
voeg geen willekeurige objectmethoden toe. Vaste arrays worden geschreven `[T; N]` en
vectoren als `Vector<T>`. De ondersteunde handtekeningen zijn:

| Ontvanger   | Werkwijze       | Handtekening            |
| ----------- | --------------- | ----------------------- |
| `Array<T>`  | `length`        | `() -> u32`             |
| `Array<T>`  | `get`           | `(u32) -> Option<T>`    |
| `Array<T>`  | `set`           | `(u32, T) -> Array<T>`  |
| `Array<T>`  | `iter`          | `() -> Iterator<T>`     |
| `Vector<T>` | `length`        | `() -> u32`             |
| `Vector<T>` | `get`           | `(u32) -> Option<T>`    |
| `Vector<T>` | `set`           | `(u32, T) -> Vector<T>` |
| `Vector<T>` | `push` of `add` | `(T) -> Vector<T>`      |
| `Vector<T>` | `pop`           | `() -> Option<T>`       |
| `Vector<T>` | `iter`          | `() -> Iterator<T>`     |

De spelling `add` is opzettelijk een compatibiliteitsalias voor vector
`push`; het is geen arraymethode. Indices zijn `u32`, elementargumenten moeten
match `T`, en de geretourneerde waarden moeten overeenkomen met de bovenstaande handtekeningen. Verkeerde ariteit,
argumenttypen, ontvangertypen en onbekende methoden zijn typecontrolefouten.
Lege letterlijke waarden vereisen een contextueel elementtype, terwijl niet-lege array/vector
letterlijke elementen leiden hun elementtype recursief af en verwerpen gemengde elementen. EEN
fixed array literal moet exact `N`-elementen bevatten.

Lokale waarden zijn functiegericht, precies één keer geïnitialiseerd en kunnen niet eerder worden gelezen
hun verklaring. Een lokale aangifte overschaduwt geen bestaande naam: duplicaat
namen zijn een fout. Functies en mogelijkhedenaliassen delen één modulenaamruimte
en moet uniek zijn. Een aanroep moet een gedeclareerde of geïmporteerde functie een naam geven
capaciteit, en de ariteit en argumenttypen moeten exact overeenkomen.

Het v1-controlestroomoppervlak is gestructureerd `if`/`else`, `while`, C-stijl `for`,
`do while` en vroege `return`. `for`-clausules zijn expliciete verklaringen en dat is ook zo
geen klassen, ontvangers of impliciete mutaties buiten de lus introduceren
lokale waardeomgeving. Er is geen impliciet doorvalresultaat: elke
Het bereikbare pad in een niet-`unit`-functie moet het gedeclareerde type retourneren. De
bootstrap checker rapporteert retourtypefouten; Bereikbaarheidsanalyse is een
vereiste follow-up voordat een compiler volledig v1-conform wordt verklaard.

FWS is opzettelijk klassenvrij. `class`, `constructor`, `extends`, `impl`,
`new` en `trait` zijn gereserveerd en afgewezen met stabiele diagnose
`FWS-PARSE-052`; onveranderlijke structuren, getagde enums, interfaces en functie
waarden zijn de ondersteunde waardegerichte alternatieven. De geënsceneerde zelfhosting
contract houdt de ingecheckte TypeScript-compiler als zaad terwijl de FWS-compiler
en runtimecontracten worden stapsgewijs opgestart.

## Bestandsgedefinieerde modules, bronimport en export

Er is geen geneste `module`-declaratie. Elk `.fws`-bestand is een module en zijn
stabiele naam is afgeleid van de genormaliseerde bestands-ID. Bijvoorbeeld
`src/time.fws` in project `/workspace/app` heeft module-ID `src/time`. Genest
De syntaxis van `module name { ... }` wordt afgewezen bij een migratiediagnostiek.

Het importeren van bronmodules verschilt van het importeren van hostmogelijkheden:

```fws
import "./math.fws" as math;
import capability "clock.now" as now() -> i64;
```

De Vite-adapter lost bronimporten op via de modulegrafiek. Afhankelijkheden
binnen één project zijn standaard statisch gekoppeld. Standaard voor projectoverschrijdende randen
tot dynamisch laden en kan worden geconfigureerd als `static` of `dynamic` met expliciete
project-root linkconfiguratie. Ontbrekende modules, cycli die niet worden ondersteund door de
geselecteerde koppelingsmodus en identiteitsbotsingen zijn grafische diagnostische gegevens.

Statische koppelingen maken de bereikbare gastenexport tot één artefact. Botsingen exporteren
worden deterministisch afgewezen (`FWS-LINK-003` voor dubbele handtekeningen en
`FWS-LINK-004` voor incompatibele handtekeningen); de linker doet dat niet in stilte
naamruimte of overschrijf gastfuncties. Dynamische koppelingen blijven een aparte module
grenzen en worden nooit geregistreerd als import van bronmodules in het ABI-manifest
als ambient host-mogelijkheden.

Alleen declaraties voorafgegaan door `export` zijn openbaar. Exportnamen zijn stabiel,
hoofdlettergevoelige tekenreeksen en worden lexicografisch gesorteerd in een gegenereerd
manifesteren. Privéfuncties kunnen worden gebruikt door geëxporteerde functies, maar dat is niet het geval
zichtbaar voor de gastheer. Er is geen wildcard-export en geen ambient-import.

Capability-imports hebben een geciteerde naam die eigendom is van de host en een gast-lokale alias:

```fws
import capability "clock.now" as now() -> i64;

export fn current_time() -> i64 {
  return now();
}
```

De genoemde capaciteitsnaam, alias, parameternamen/-typen en resultaattype zijn
allemaal opgenomen in het manifest. Importen zijn deterministisch: dubbele aliassen of
capaciteitsdeclaraties worden afgewezen, en vereiste capaciteitsnamen wel
gededupliceerd en gesorteerd. De host levert implementaties op capaciteitsnaam;
de gast kan geen mogelijkheid ontdekken of oproepen die er niet in zit
manifesteren.

## Logische capaciteit ABI

Forge Web Script gebruikt een WASI-geïnspireerde _logische_ grens, geen claim van volledig
WASI-compatibiliteit. Een mogelijkheid is een beperkte, expliciete hostfunctie zoals
`clock.now`, `random.bytes` of `storage.read`. Mogelijkheidsnamen zijn eigendom van
het platform, en elke naam heeft een handtekening met een afzonderlijke versie. DOM-objecten,
Ingebouwde `window`, `document`, Node, netwerkclients en andere globale browsers
zijn nooit afhankelijkheden van omgevingsgasten.

De lader voert deze controles uit vóór instantiatie:

1. Het manifestformaat, de taalversie en de ABI-versie worden ondersteund.
2. Alle vereiste mogelijkheden zijn aanwezig in het hostregister.
3. Elke geleverde mogelijkheid heeft de exact aangegeven handtekening en geen niet-aangegeven handtekening
   gastimport wordt geaccepteerd.
4. Geheugen-, allocator-, export- en importaangiften zijn intern
   consistent.

Mogelijkheidsdetectie is een expliciete hostbewerking. Een gastheer kan een
capaciteitsinventarisatie naar applicatiecode, maar de gast ontvangt alleen de
invoer aangegeven door zijn module. Ontbrekende of geweigerde mogelijkheden mislukken met a
laadtijd `CapabilityDenied` trap; ze worden niet `undefined` of a
stille no-op.

## Waarden, lineair geheugen en eigendom

De module maakt gebruik van één WebAssembly lineair geheugen met 64 KiB-pagina's en little-endian
scalaire waarden. Scalaire waarden worden als volgt toegewezen:

| Webscript smeden  | WebAssembly-vertegenwoordiging                       |
| ----------------- | ---------------------------------------------------- |
| `bool`            | `i32`, waarbij `0` onwaar is en `1` waar is          |
| `i32`, `u32`      | `i32`                                                |
| `i64`, `u64`      | `i64`                                                |
| `f32`, `f64`      | bijpassende WebAssembly vlotter                      |
| `unit`            | geen resultaatwaarde                                 |
| `string`, `bytes` | twee `u32`-waarden: pointer en vervolgens bytelengte |

Het manifest declareert dezelfde toewijzing in `valueRepresentations`. EEN
Het wijzerlengtepaar wordt altijd gecontroleerd als een niet-ondertekend bereik voordat of wordt gelezen
schrijven: `pointer <= memory.byteLength` en `length <= byteLength - pointer`.
De nullengte is geldig en kan elke in-bounds-aanwijzer gebruiken, inclusief het einde van
geheugen. Bij een mislukte controle wordt `MemoryOutOfBounds` onderschept en wordt nooit een
gedeeltelijk gedecodeerde waarde.

De gegenereerde module exporteert `fws_alloc(size: u32) -> u32`,
`fws_dealloc(pointer: u32, size: u32) -> unit`, en
`fws_realloc(pointer: u32, oldSize: u32, newSize: u32) -> u32` als eigendom
grens voor buffers. In handtekeningsteno is de bewerking:
`fws_realloc(pointer, oldSize, newSize) -> pointer`. De beller die een buffer toewijst, is eigenaar en moet dat doen
de toewijzing ongedaan maken of opnieuw toewijzen met dezelfde module en de exacte huidige grootte.
De hertoewijzer geeft er de voorkeur aan om de huidige toewijzing voor hoogwater aan te passen,
inclusief krimpen en groeien wanneer het lineaire geheugen kan groeien. Anders het
wijst een vervanging toe, kopieert exact `min(oldSize, newSize)` bytes, en
geeft de oude toewijzing vrij voordat de vervangende aanwijzer wordt geretourneerd. EEN
Het resultaat van nul grootte is geldig en een verzoek van gelijke grootte retourneert het origineel
wijzer. Hostimplementaties moeten invoerbytes kopiëren vóór de gastoproep
keert terug tenzij het manifest expliciet een toekomstige geleende buffer introduceert
contract. De gastcode mag na een hostoproep geen aanwijzer van de host bevatten.
Toewijzings- of groeimislukkingen met `MemoryExhausted`; een ongeldige aanwijzer of
vallen met groottebereik met `MemoryOutOfBounds`; en een oude aanwijzer, onjuist
`oldSize`, dubbel vrij of ongeldige vrije vallen met `InvalidOwnership`. Deze
controles vinden plaats vóór de mutatie, en bij een mislukte hertoewijzing blijft het origineel over
toewijzing en bytes ongewijzigd.

Hostuitzonderingen worden geconverteerd naar `HostError` met de mogelijkheidsnaam en een
ondoorzichtige hostfoutcode. Gastvallen worden nooit omgezet in gewoon rendement
waarden. Hosts mogen trapdetails registreren, maar ze mogen geen geheimen of onbewerkte gegevens prijsgeven
browseruitzonderingen op niet-vertrouwde gastcode.

### Door gasten gecontroleerde geheugenbewerkingen

FWS-bronmodules die een stateful gastheap implementeren, kunnen gebruikmaken van de compiler die eigendom is van de compiler
bewerkingen `memory_alloc(size: u32) -> u32`,
`memory_dealloc(pointer: u32, size: u32) -> unit`,
`memory_realloc(pointer: u32, oldSize: u32, newSize: u32) -> u32`,
`memory_load_u32(address: u32) -> u32`, en
`memory_store_u32(address: u32, value: u32) -> unit`. Deze operaties zijn
rechtstreeks naar de module-allocator verlaagd of het WebAssembly-geheugen gecontroleerd
instructies; het zijn geen host-importen en ze stellen de gaststaat niet bloot aan
TypeScript.

De allocator gebruikt hetzelfde eigendoms- en trapcontract als `fws_alloc` en
`fws_realloc`. Voor het laden of opslaan is een volledig bereik van vier bytes nodig binnen de
huidig lineair geheugen; een ongeldig bereik trapt eerder met `MemoryOutOfBounds`
de bewerking kan gedeeltelijk worden uitgevoerd. `memory_realloc` behoudt de eerste
`min(oldSize, newSize)` bytes en retourneert een aanwijzer die eigendom is van een gast, terwijl bellers
moet de geretourneerde aanwijzer en de exacte huidige grootte ervan gebruiken voor latere bewerkingen.
Het stateful-memory-armatuur onder
`packages/forge-web-script/src/fixtures/stateful-memory.fws` is de conformiteit
vaste waarde voor deze handtekeningen, hergebruik van allocators, recursie, reset en grenzen
vallen.

Bytelezers die eigendom zijn van de compiler bieden ook niet-ondertekende indexvarianten voor gasten
frontends die bronverschuivingen vertegenwoordigen als handvatten: `bytes_length_u32(value:
bytes) -> u32` and `bytes_byte_at_u32(waarde: bytes, index: u32) -> u32`. Zij
gebruik dezelfde aanwijzerlengtegrenscontroles als de ondertekende `bytes_length` en
`bytes_byte_at`-bewerkingen en zijn geen host-importen. De WebLua-frontend maakt gebruik van
deze bewerkingen om lexer-offsets en gastgeheugenadressen in één te houden
gecontroleerd `u32` domein.

### Raw WASM ABI en gegenereerd ESM-contract

De bovenstaande weergave is de stabiele, onbewerkte WASM ABI. Het is opzettelijk
laag niveau en verandert niet wanneer de gegenereerde JavaScript-gevel groter wordt
ergonomisch:

```text
raw string value: (pointer: u32, length: u32)
raw bytes value:  (pointer: u32, length: u32)
```

Het door de compiler gegenereerde ESM-artefact projecteert die ABI in een JavaScript-API:

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

Elke gegenereerde aangifte, inclusief mogelijkhedenimport en dynamisch gekoppeld
exporteert, gebruikt `string` voor FWS `string`-waarden. De gegenereerde `load` en
`loadSync`-wrappers coderen JavaScript-tekenreeksen als UTF-8 en geven de pointerlengte door
koppelt aan de ongewijzigde WASM ABI en decodeert geretourneerde tekenreeksen terug naar JavaScript
snaren. Decodering maakt gebruik van een fatale UTF-8-decoder: verkeerd opgemaakte gastbytes zijn een
expliciete grensfout in plaats van vervangende tekens.

Tekenreeksargumenten voor één aanroep worden eerst gecodeerd en in één aaneengesloten reeks verpakt
toewijzing van gasten. Hierdoor blijft de onbewerkte ABI ongewijzigd en wordt één gast vermeden
toewijzing en JavaScript-naar-WASM-kopie per argument. Scalaire argumenten blijven behouden
hun directe snelle pad. `bytes` wordt bewust niet omgezet naar `Uint8Array`:
bellers blijven `ForgeWebScriptBytes` doorgeven en ontvangen, en `memory` is
zichtbaar zodat bellers onbewerkte bytebereiken kunnen lezen of schrijven met behulp van het geheugen van de module
en eigendomsregels.

De gegenereerde adapter is eigenaar van tijdelijke buffers die zijn gemaakt voor tekenreeksargumenten en
reeks resultaten. Het decodeert een resultaat voordat het wordt vrijgegeven, en geeft vervolgens elk resultaat vrij
tijdelijk bereik precies één keer in een `finally`-pad voor succes, gasttraps, host
uitzonderingen en decoderingsfouten. Een hostmogelijkheid met tekenreekswaarden ontvangt
JavaScript-tekenreeksen en kan een JavaScript-tekenreeks retourneren; de wikkelaar voert de
gasttoewijzing en UTF-8-kopie voor die retourwaarde. Hostcode moet nog steeds worden gekopieerd
onbewerkte `bytes`-invoer voordat deze terugkeert, tenzij een toekomstig manifest dit expliciet aangeeft
een geleend buffercontract. `load` en `loadSync` tonen hetzelfde gegenereerde bestand
overeenkomst; ze verschillen alleen wat betreft de planning van de module-initialisatie.

Het wijzigen van deze JavaScript-projectie verandert niets aan `valueRepresentations`, de
onbewerkte ABI met aanwijzerlengte, de ABI-versie of de onbewerkte WASM-inhoudhash.
Het gegenereerde artefact behoudt één lui gedecodeerde ingebedde WASM-representatie;
`load` en `loadSync` delen het in plaats van een afzonderlijke payload te realiseren
kopieën. Bijgevolg moeten async-versus-sync-ladercontroles het gedrag vergelijken
en verklaringen, terwijl deterministische inhoud-hash-controles de onbewerkte inhoud moeten hashen
WASM-bytes onafhankelijk van de gegenereerde ESM-brongrootte of laderimplementatie
details.

## Duidelijk formaat

Elke gegenereerde module heeft naast het stabiele JSON-compatibele ABI-manifest
WASM-artefact en getypte ESM-lader:

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

Het daadwerkelijke manifest bevat niet alleen alle primitieve representatiegegevens
die in het voorbeeld worden gebruikt. JSON-sleutels voor export, import en mogelijkheden zijn
stabiel bij herhaalde builds; bronkaarten en inhoudshashes worden uitgezonden door
de compileradapter en maken geen deel uit van het matchen van ABI-handtekeningen.

Het `standardLibrary`-manifestveld registreert bibliotheekidentiteiten die eigendom zijn van de compiler.
Voor regex zijn `regexBytecodeVersion` en een optionele `regexCorpusHash` cache
en artefactinvoer. De genormaliseerde bron, compilerversie, optimalisatie
modus, modulegrafiek, linkconfiguratie, standaardbibliotheekidentiteit en metadata
corpus-hash moet in een stabiele volgorde worden geserialiseerd voordat er in de cache kan worden gezocht. Identiek
inputs produceren identieke bytecodetabellen, manifesten, declaraties, WAT en
inhoudshashes; het wijzigen van elke identiteitsinvoer is een cache-misser. Een corpus-hash is dat wel
eigendom van het pakket dat het corpus levert en mag niet worden afgeleid van de host
runtime-status.

## Compiler- en CLI-grenzen

De publieke TypeScript-gevel houdt frontend-contracten en orkestratie gescheiden
uit emissie. Het accepteert een bronbestand of een opgeloste grafiek en produceert gestructureerd
diagnostiek plus getypte IR, en delegeert WebAssembly/WAT-generatie aan
`@mission-platform/forge-web-script-wasm`. De backend valideert zijn bytes eerder
ze retourneren; fouten onderdrukken uitvoerbare uitvoer. De Vite-adapter en LSP-gebruik
de gevel en zijn niet afhankelijk van de Node CLI.

Voor bestandssysteemworkflows installeert u `@mission-platform/forge-web-script-cli` en
gebruik het zelfstandige `forge-web-script` binaire bestand:

```text
forge-web-script check <entry.fws> [--root <directory>] [--project-root <directory>]
forge-web-script compile <entry.fws> --out-dir <directory>
  [--root <directory>] [--project-root <directory>]
  [--link-mode static|dynamic] [--capability <name>] [--optimization debug|release]
```

`check` valideert bron- en grafiekinvoer zonder bestanden te schrijven. Een succesvolle
`compile` schrijft exact `<entry>.wasm`, `<entry>.wat`, `<entry>.abi.json`,
`<entry>.d.ts`, `<entry>.js` en `<entry>.map` naar de geselecteerde uitvoermap.
De CLI faseert en hernoemt de volledige set pas nadat de diagnose duidelijk is
verkeerd opgemaakte bron, onopgeloste grafiekranden, geweigerde mogelijkheden en ABI-fouten
laat geen uitvoerbaar artefact achter en retourneert een status die niet nul is. Uitvoerbestelling,
manifest JSON, WAT, declaraties, ladergegevens, bronkaarten en inhoudshashes
zijn deterministisch voor identieke invoer.

## Vitest en Vite testen integratie

Gebruik `@mission-platform/forge-web-script-vitest` wanneer een Vitest-suite dit nodig heeft
claim compilerartefacten, gestructureerde diagnostiek, Wasm-gedrag, grafiekkoppelingen,
of het gegenereerde Vite-modulecontract. De directe harnasmethoden (`compile`,
`compileSource`, `compileGraph`, `inspect`, `load`, `loadSync` en
`checkVmParity`) delegeren aan de openbare compiler/runtime-contracten; zijn
`defineForgeWebScriptVitestConfig`-helper installeert de productie
`forgeWebScriptPlugin` met behoud van de Vite-plug-ins en instellingen voor consumenten.
Zie [Testen in Mission Platform](../../../../../../docs/locales/nl/testing.md#forge-web-script-tests) voor de
configuratie- en armatuurvoorbeelden.

Het harnas accepteert alleen hostfuncties via expliciet ingetoetste capaciteitskaarten
op basis van manifeste capaciteitsnamen, bijvoorbeeld:

```ts
const exports = await harness.load<{ current: () => bigint }>('capabilities/clock-now.fws', {
  'clock.now': { now: () => 123n },
});
```

Ontbrekende aangegeven invoer en niet-aangegeven geleverde invoer zijn mislukkingen. Testen
projecten die `.fws` of de virtuele artefactquery's importeren, moeten de
subpad voor declaratie alleen van het type
`@mission-platform/forge-web-script-vitest/forge-web-script` naar hun
TypeScript `types`-lijst of een ingangspunt voor het testtype waarnaar wordt verwezen.

De gedeelde harnasbevestigingen onder
`packages/forge-web-script-vitest/fixtures/` is het pakketoverschrijdende corpus voor
geldige modules, diagnostiek, mogelijkheden, grafieken en zelf-gehoste pariteit.
Pakket-lokale armaturen blijven geschikt voor compiler, runtime en plug-in
tests die privégegevens gebruiken.

`checkVmParity` rapporteert het begrensde, zelf-hostende pariteitscontract in de lex-fase in
`interpret`, `jit` of `aot`-modus. Beweer pariteit, vingerafdrukken, stappentellingen,
en AOT-reproduceerbaarheidsmetagegevens, maar behandel dit rapport niet als willekeurig
gecompileerde FWS VM-uitvoering; Wasm-laden blijft de runtime-gedragscontrole.

## Diagnostiek

Diagnostische gegevens zijn gestructureerde records met `code`, `severity`, `phase`, `message`,
`fileName` en een bron `span`; bruikbare records kunnen ook `hint` bevatten.
De fase is een van `lex`, `parse`, `type-check` of `abi`. Stabiele v1-code
gezinnen zijn onder meer:

| Codeer familie | Betekenis                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| `FWS-LEX-*`    | ongeldige tekens/escapes, onbewerkte tekenreeksregelterminators of niet-afgesloten tekenreeksen/opmerkingen |
| `FWS-PARSE-*`  | ongeldige syntaxis van module, declaratie, instructie of expressie                                          |
| `FWS-TYPE-*`   | ongeldig primitief type, naam, operator, argument of return                                                 |
| `FWS-ABI-*`    | dubbele namen, geweigerde mogelijkheden, export of import                                                   |
| `FWS-REGEX-*`  | niet-ondersteunde of verkeerd ingedeelde regex-patronen die eigendom zijn van de compiler                   |

Fouten voorkomen het genereren van artefacten. Waarschuwingen en informatieve diagnostiek doen dat wel
de semantiek niet veranderen. Diagnostische volgorde is bronvolgorde, gevolgd door fase
bestelling voor diagnostiek gekoppeld aan hetzelfde bereik. Een Vite-adapter moet behouden blijven
de stabiele code en spanwijdte bij het doorsturen van een fout naar Vite.

## Bootstrap-conformiteitscontract

Het doel van de v1-compiler is opzettelijk beperkt tot het taal- en ABI-oppervlak
hier gedocumenteerd. Een programma bevindt zich in de bootstrap-subset als het er een gebruikt
module, de bovenstaande lexicale regels, primitieve typen, `string`/`bytes`-waarden,
expliciet geëxporteerde functies, import van mogelijkheden, lokale aangiften, oproepen,
expressies, `if`/`else`, `while`, C-stijl `for`, `do while` en `return`.
Het uitgebreide aggregaatcontract wordt afzonderlijk op conformiteit getest en aangevuld
structs, enums, generieke typen, verzamelingswaarden, functiewaarden en
`match`; het mag niet afhankelijk zijn van een impliciete browser of Node global.

`packages/forge-web-script/src/fixtures/bootstrap.ts` is het uitvoerbare bestand
conformiteitscorpus. Geaccepteerde armaturen moeten valideren zonder foutdiagnostiek;
afgewezen armaturen moeten hun vermelde stabiele diagnostische codes rapporteren en geldig zijn
bronomvang. Implementaties in andere talen kunnen hetzelfde armatuur gebruiken
vorm en vergelijk genormaliseerde AST's, diagnostiek en manifeste JSON. Het armatuur
suite is een conformiteitsdoel, geen implementatiespecifieke momentopname.

Het gedeelde broncorpus in
`packages/forge-web-script-vitest/fixtures` bestrijkt dezelfde grens:
`valid/collections.fws` oefent verzamelingsliterals, indexering, contextueel
lege vectoren, `length()` en geldige ontsnapte tekenreeksen;
`valid/aggregates.fws` oefent functiewaarden uit, gekwalificeerde `Result::Ok` en
`Result::Error`-constructors en arm-local match-bindingen; en
`diagnostics/collections.fws` oefent ongeldige incassoaanroepen en aggregaties uit
constructor/bindingsdiagnostiek. Ook het verzamelarmatuur wordt samengesteld
via het gedeelde Wasm-harnas; de geaggregeerde syntaxis blijft behouden als frontend
conformiteitsbron totdat aggregaat Wasm-verlaging is ingeschakeld voor dat harnas.

## Compatibiliteitsbeleid

Taal- en ABI-hoofdversies zijn standaard incompatibel. Een lader kan dit accepteren
dezelfde grote ABI met een hogere secundaire versie alleen wanneer de producent de
nieuwe velden zijn optioneel en de consument negeert onbekende velden veilig. Het verwijderen van een
exporteren, een type wijzigen, van eigenaar veranderen of een mogelijkheid wijzigen
handtekening vereist een brekende ABI-revisie en moet door laders worden afgewezen
voer het niet uit. ABI `1.2` is ondanks behoud zo'n baanbrekende revisie
de `1.x`-nummering: de vereiste `fws_realloc`-geheugenexport is niet optioneel,
en ABI `1.1`-manifesten worden niet stilzwijgend geüpgraded. Nooit een mogelijkheid toevoegen
verandert stilletjes een bestaande module: het vereist een nieuwe manifestdeclaratie en
goedkeuring van de gastheer.

Compilerversies zijn geen ABI-versies. Compilers moeten hun versie opnemen in
de compileerinvoer en artefact-hash, maar laders vergelijken de taal en ABI
versies plus de manifesthandtekening. Een mislukte compatibiliteitscontrole is een
laadtijddiagnostiek, geen runtime-fallback. Rust- en AssemblyScript-modules
zullen tijdens de co-existentie hun bestaande wrappers en ABI-contracten blijven gebruiken
periode; Forge Web Script herinterpreteert of vervangt ze niet.

De standaardbibliotheekcompatibiliteit van Regex is opzettelijk gescheiden van de hostregex
compatibiliteit. Het Forge-bytecodecontract en de compiler definiëren de geaccepteerde
syntaxis en stabiele diagnostiek; de referentie-VM wordt alleen gebruikt om de
gedrag uiterst links/achterwaarts, UTF-16-vangstcompensaties en `-1` uitgeschakelde schildwacht
totdat de back-end-VM beschikbaar is. Browser- of Node-gedrag met reguliere expressies
is slechts een differentieel orakel, en noch de TypeScript referentie-VM, noch een
host reguliere-expressie-API kan een productiestandaardbibliotheekaanroep uitvoeren.
Wijziging van de opcodenummering, lay-out van capture-slot, ondersteunde syntaxis, diagnostiek
codes of overeenkomende semantiek vereisen een nieuwe regex-bytecodeversie en een nieuwe
artefact identiteit. Tot backend/runtime-conformiteit en telefoonnummermigratie
bewijsmateriaal compleet is, blijft de AssemblyScript-telefoonimplementatie een
expliciet legacy-regressie-orakel en wordt nooit gemengd met een Forge-artefact.

## Coëxistentie en migratie

Forge Web Script is het productiedoel voor de neutrale
`@mission-platform/code-scanner`-artefact. De scannergrafiek is statisch gekoppeld
de QR-, matrix- en barcodedecoderbronnen in één op zichzelf staande WebAssembly
artefact; het dynamische profiel houdt de grenzen van de bronmodule expliciet en
caches hebben exporten opgelost. De Rust `code-scan` krat blijft verkrijgbaar als
native/referentie-implementatie en is geen runtime-afhankelijkheid van het pakket.
De openbare QR-, matrix- en barcodepakketten behouden hun eigen getypte wikkels;
deze API's worden niet stilletjes omgeleid via de scannergrafiek.

De `codecMigrationFixture` in
`packages/forge-web-script/src/fixtures/codec-migration.ts` is de eerste
conformiteitsarmatuur in de vorm van een codec-adapter. Het verklaart
`codec.barcode.encode(payload: string) -> bytes`, exporteert `encode_payload`, valideert de
ABI met pointerlengte en gebruikt een injecteerbare host om uitvoer die eigendom is van de beller te schrijven.
Het blijft bewust een smal ABI-armatuur: de gastheer kan een deterministiek gebruiken
nep voor conformiteitstests terwijl het armatuur het Forge Web Script bewijst
grens. Voor productiecodec-pariteit zijn nog steeds overeenkomende vectoren en
prestatiemetingen, niet alleen een overeenkomende functienaam.

De overeenkomstige oude wrapper exporteert `encode(symbology, data)` en retourneert
`Uint8Array | undefined`; het armatuur exporteert `encode_payload(payload)` en
retourneert een `bytes`-paar dat eigendom is van ABI. Dat opzettelijke verschil houdt de
capaciteitsgrens expliciet: een migratieadapter kan de erfenis in kaart brengen
symbologie/data roepen de aangegeven mogelijkheid op, maar het armatuur doet dat niet
doen alsof de twee exporten qua gedrag al uitwisselbaar zijn.

### Een implementatie selecteren

| Werklast of vereiste                                                                  | Selecteer                                                              | Reden                                                                                                                                     |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Bestaand QR- of matrixpakketgedrag                                                    | `@mission-platform/qr-code` / `@mission-platform/matrix-code`          | Pakketspecifieke ESM-wrappers blijven beschikbaar voor deze openbare API's.                                                               |
| Neutraal beeld- en camerascannergedrag                                                | `@mission-platform/code-scanner`                                       | Maakt standaard gebruik van een statisch gekoppelde FWS-grafiek, of een expliciet dynamisch bronmoduleprofiel met verzending in de cache. |
| Bestaand streepjescodegedrag                                                          | `@mission-platform/barcode`                                            | Pakket-lokale Forge Web Script-grafieken bieden de getypte barcode-façade.                                                                |
| Nieuw browserveilig computergebruik voor algemeen gebruik met expliciete hosteffecten | Webscript smeden plus `@mission-platform/vite-plugin-forge-web-script` | `.fws`-bron-, manifest-, getypte lader en standaard-deny-by-default-mogelijkheden met versieversie.                                       |
| Bestaande AssemblyScript-bron of een AssemblyScript-specifieke migratie               | `@mission-platform/vite-plugin-assemblyscript`                         | Compileert `.ts` AssemblyScript-vermeldingen en behoudt het gegenereerde onbewerkte exportcontract.                                       |
| Kaderneutrale UI/componentcompilatie                                                  | Componentcompiler smeden                                               | Forge Web Script is geen vervanging voor `FrameworkOutputPlugin` of componentdoelen.                                                      |

Gebruik de Forge Web Script Vite-plug-in alleen voor `.fws`-vermeldingen. Gebruik de
AssemblyScript-plug-in voor bestaande AssemblyScript-vermeldingen. Tijdens de migratie kan een
applicatie kan beide soorten modules bundelen: elke lader bezit zijn eigen module
initialisatie, geheugen en ABI-validatie en het importeren van mogelijkheden moeten zijn
expliciet geleverd aan Forge Web Script-modules.

### Bewijs- en afschrijvingspoort

Migratiewerk zou voor elke kandidaat vier onafhankelijke vergelijkingen moeten registreren:

1. geëxporteerd gedrag tegen gedeelde gouden vectoren, inclusief ongeldige invoer en
   grensgevallen;
2. ABI-veiligheid, inclusief manifest-/versiecontroles, importweigering, grenscontroles,
   trapconversie en buffereigendom;
3. gegenereerde artefactstabiliteit, inclusief reproduceerbare hashes, declaraties,
   bronkaarten en laden van browser/Node; en
4. een representatieve prestatiemeting bij het bouwen van releases met betrekking tot compileren
   tijd, artefactgrootte, initialisatie en steady-state oproepen.

De migratiearmatuur levert momenteel de ABI- en artefactgedeelten hiervan
bewijs. De bestaande barcodeverpakkings- en decoderpakkettests blijven de
gedrags- en erfenisregressie-orakel; laat ze liever langs het armatuur lopen
dan het armatuur te behandelen als een vervangende benchmark. Smeed web
Script mag een Rust- of AssemblyScript-pad niet afschaffen totdat een werklast voorbij is
alle vier de vergelijkingen in twee ondersteunde hostomgevingen hebben een gedocumenteerde
terugdraaipad en heeft geen onopgeloste ABI- of beveiligingsbevindingen. Afschrijving dan
vereist een aangekondigd compatibiliteitsvenster en een adapter- of migratiegids;
verwijdering vereist een volgende grote release.

## Klassevrije aggregaat- en uitvoeringscontracten

Het uitgebreide klassevrije contract voegt onveranderlijke `struct`-waarden toe, met de tag `enum`
waarden, structurele `interface`-declaraties tijdens het compileren, generieke parameters
met interfacegrenzen, functiewaarden, verzamelingsliterals/methoden, en
`match` expressies/instructies. Gekwalificeerde enum-constructors gebruiken `Type::Variant`
en wedstrijdbindingen zijn arm-lokaal; bijvoorbeeld,
`Result::Ok(item) => item` bindt `item` alleen in die arm. De standaard
Het `Result<T, E>`-contract gebruikt `Ok(T)` en `Error(E)`, niet `Err(E)`.
Structurele updates zijn pure waardetransformaties; noch structs, noch interfaces
hebben constructors, identiteit, overerving, ontvangers of runtime-verzending. Elke
proberen klasse-/objectgeoriënteerde constructies te declareren (inclusief `class`,
`constructor`, `extends`, `impl`, `new` en `trait`) wordt afgewezen met stabiele
diagnostische `FWS-PARSE-052`.

Geaggregeerde lay-outs worden in het manifest vastgelegd in de volgorde van de canonieke namen. Structuur
velden zijn geordend, uitgelijnde waarden van vier bytes; enum-lay-outs beginnen met een vier-byte
discriminerend. Veldeigendom is expliciet (`owned`, `borrowed` of `shared`) en
standaard ingesteld op onveranderlijke opslag in eigendom. Generieke waarden zijn gespecialiseerd per beton
soort; op descriptor gebaseerde representaties zijn gereserveerd voor expliciete iterator- of
grensvlakken en worden weergegeven door specialisatierecords.

Het VM-bytecodecontract is backend-onafhankelijk. A `ForgeWebScriptVmModule`
bevat getypte functies, constanten, geaggregeerde lay-outs, specialisaties,
importmogelijkheden, bronbereiken en het lineaire geheugen van 64 KiB
`fws_alloc`/`fws_dealloc`/`fws_realloc` grens. `interpret`, `jit` en `aot` worden uitgevoerd
modi via dezelfde instructie/waarde/trap-semantiek; JIT-cachesleutels en AOT
artefacten omvatten compiler- en bronhashes. Mogelijkheden zijn alleen opvraagbaar
indien aanwezig in het modulemanifest.

Reactieve runtimestatus is data: entiteitsindices gebruiken generatietellers,
Componentwinkels en werelden zijn onveranderlijke momentopnamen, en systemen keren terug naar de wereld
overgangen. Signalen, abonnementen, vraagvereisten, deterministische volgorde,
en begrensde plannerstappen zijn expliciete waarden. ECS-hostintegratie vereist
dezelfde aangegeven capaciteitsgrens als elke andere FWS-import.

## Grens van het bereik

De v1-implementatie is een TypeScript frontend plus deterministische WebAssembly
backend, zichtbaar via de compatibiliteitsgevel en de zelfstandige Node CLI.
De conformiteitsarmaturen en gegenereerde artefacten zijn het compatibiliteitsdoel.

Zelf-gehoste compilatie (waarbij de compiler als een FWS-programma wordt uitgevoerd) is expliciet toegestaan
ondersteund door het klassevrije oppervlak en de uitvoering van VM-bytecodes van dit v1-contract
model, maar dit is niet vereist voor de juistheid van de v1 ABI en taal
grens. Rijkere taalfuncties, vervanging van bestaande Rust of
AssemblyScript-workloads en andere niet-v1-compiler-evoluties vallen hier buiten
contract.

## Tooling-cutover en bootstrap-grens

De CLI, Vite-plug-in, taalservice en LSP gebruiken allemaal de openbare compiler
servicecontract. De lexer-migratie is opzettelijk LSP-first: het ingecheckte
EBNF-grammatica definieert het TypeScript-tokencontract, de taalservice en
editoradapters vormen de eerste acceptatiegrens, en compiler/frontend of
zelf-gehost eigendom mag pas worden verplaatst als tokensoorten, diagnostiek, symbolen,
voltooiings-, hover- en UTF-16-bereiken zijn conform. De huidige begrensde FWS-auteur
lex/token-fase blijft een compatibiliteitspariteitspad terwijl de TypeScript lexer
en taalservicepoort worden gemigreerd; het is niet de grammaticale autoriteit.

Nadat de LSP-poort groen is, wordt dezelfde grammatica geport naar de FWS/VM-lexer
en vervolgens naar de begrensde parsermodulefase. De resterende frontend, linker,
optimizer-, manifest- en Wasm-emissiefasen worden hierin nog steeds ondersteund
loslaten; deze grens is opzettelijk en wordt zichtbaar als
`ForgeWebScriptSelfHostedStageReport` in plaats van als compleet te worden gepresenteerd
zelf-hosting.

De CLI selecteert de VM-modus met `--vm-mode interpret|jit|aot`. De Vite-plug-in
en taalservice-werkruimteopties gebruiken de overeenkomstige `selfHostedVmMode`
waarde. Alle drie de modi voeren dezelfde bytecode uit en vergelijken de lex-vingerafdruk
met de onafhankelijke zaadreferentie. Een mismatch of VM-trap wordt stabiel
`FWS-BOOTSTRAP-001` diagnosticeert en voorkomt dat er een ongeldig Wasm-artefact ontstaat
uitgezonden. `interpret` is bedoeld voor snelle controles, terwijl `jit` en `aot` bedoeld zijn
conformiteit/ontwikkelingsmodi; samengestelde Wasm blijft de normale productie
artefact en runtimepad.

Grafiekkoppeling, verklaringen, bronkaarten, ABI-manifesten, deterministische hashes,
eigendom van lineair geheugen, ontkenning van mogelijkheden, verzameling/ECS-waarden en expliciet
De mogelijkheden van asynchrone planners blijven beheerst door de bestaande overheidscontracten.
De toolingadapters voegen geen ambient host-API's of impliciete objectverzending toe.
Microtaken en Web Workers zijn alleen beschikbaar via de aangegeven planner
capaciteiten, en hun ordening blijft expliciet en deterministisch. Consumenten
moet het VM-rapport behandelen als een pariteits-/conformiteitssignaal tot latere releases
verplaats extra compilerfasen achter dezelfde FWS-grens.
