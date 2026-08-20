# Forge WebScript v1

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> Engelse bron: [docs/forge-web-script.md](../../forge-web-script.md)
> Taal: Nederlands (nl)

Webscript vervalsen (`.fws`) is een kleine, algemene taal voor WebAssembly
werkdruk. Het is web-first, op mogelijkheden gebaseerd en doelbewust onafhankelijk van
Vue, React, de DOM en de Forge-componentcompiler. Dit document is de
gezaghebbend v1 taal- en modulecontract. De TypeScript pakket
`@mission-platform/forge-web-script` bevat de uitvoerbare bootstrap-parser,
type checker, ABI-manifesttypen en conformiteitsarmaturen.

## Status en versiebeheer

Het huidige contract is **taalversie `1.0`** en **logische ABI-versie
`1.0`**. De taalversie beschrijft bron en semantiek; de ABI-versie
beschrijft de WebAssembly-grens en het hostprotocol. Ze zijn in versievorm
zelfstandig. Een compiler moet beide versies in elke gegenereerde module schrijven
manifest, en een lader moet beide valideren vóór instantiatie.

Het bronformaat is UTF-8-tekst met de extensie `.fws` verlenging. Een bronbestand is een
enkele module. De compilerinvoer identificeert de taalversie, terwijl de
het gegenereerde manifest is de persistente versiemarkering die door laders wordt gebruikt. Toekomst
herzieningen kunnen een bronpragma toevoegen, maar v1 vereist er geen; een v1-compiler
moet een bronconstructie die hij niet begrijpt verwerpen, in plaats van de bron te raden
versie.

## Lexicale verwijzing

Witruimte is onbelangrijk, behalve binnen tekenreeksen. `//` begint een opmerking die
loopt tot het einde van de lijn. Identificatiegegevens beginnen met `A-Z`, `a-z`, of `_`, en
ga verder met die tekens of decimale cijfers. Identificatiegegevens zijn
hoofdlettergevoelig. Gehele getallen zijn niet-negatieve decimale reeksen; v1 wel
accepteert geen letterlijke hexadecimale, octale of drijvende-kommasyntaxis in de
bootstrap-subset. Tekenreeksen gebruiken dubbele aanhalingstekens en JSON-compatibele escapes en
zijn UTF-8-waarden.

De gereserveerde woorden zijn `as`, `capability`, `else`, `export`, `fn`, `if`,
`import`, `let`, `module`, En `return`. `true` En `false` zijn booleaans
letterlijke. Interpunctie wel `{ } ( ) : ; ,`; exploitanten zijn `! % * + - / < <= ==
!= > >= && || = ->`.

Elke diagnostische reeks is een halfopen source-offsetbereik `[start, end)` in de
originele UTF-16 TypeScript string (offsets tellen UTF-16-code-eenheden), met
één-gebaseerde lijn- en kolomvelden. De
bootstrap-implementatie rapporteert offsets en lijn-/kolomgegevens samen, zodat
Vite adapter kan bron-toegewezen diagnostiek produceren zonder reparing.

## Bron grammatica

De volgende grammatica beschrijft het v1-bootstrapoppervlak. De grammatica gebruikt
`*` En `?` in de gebruikelijke EBNF-zin:

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

Binaire operatoren volgen deze prioriteitsniveaus, van sterk naar zwak:
`* / %`, `+ -`, geordende vergelijkingen, gelijkheid, `&&`, En `||`. Exploitanten zijn
links-associatief. Expressies tussen haakjes zijn gereserveerd voor de volgende bootstrap
revisie; een compiler moet een parse-diagnostiek uitvoeren in plaats van stil
aanvaard ze vandaag.

## Typen en semantiek

V1 heeft de primitieve typen `bool`, ondertekend `i32`/`i64`, niet ondertekend `u32`/`u64`,
`f32`/`f64`, `string`, `bytes`, En `unit`. Er zijn geen impliciete numerieke waarden
conversies. Rekenkundige operanden moeten van hetzelfde numerieke type zijn; vergelijkingen
produceren `bool`; logische operatoren vereisen `bool`; gelijkheid vereist gelijkheid
typen. Een functie heeft één gedeclareerd resultaattype en een `unit` functie retourneert
zonder waarde.

`string` En `bytes` zijn de v1-aggregaatwaarden. Een string is onveranderlijk
reeks scalaire Unicode-waarden weergegeven als UTF-8 op de ABI-grens.
Bytes zijn een onveranderlijke reeks octetten en kunnen elke waarde bevatten
`0x00` door `0xff`. Hun activiteiten op bronniveau zijn opzettelijk klein
in de bootstrap-subset; hostoproepen en latere standaardbibliotheekmodules bieden
coderings-, slice- en verzamelbewerkingen zonder toevoeging van een omgevingsbrowser
API's voor de taal.

Lokale waarden zijn functiegericht, precies één keer geïnitialiseerd en kunnen niet eerder worden gelezen
hun verklaring. Een lokale aangifte overschaduwt geen bestaande naam: duplicaat
namen zijn een fout. Functies en mogelijkhedenaliassen delen één modulenaamruimte
en moet uniek zijn. Een aanroep moet een gedeclareerde of geïmporteerde functie een naam geven
capaciteit, en de ariteit en argumenttypen moeten exact overeenkomen.

Het v1-besturingsstroomoppervlak is gestructureerd `if`/`else` en vroeg `return`.
Er is geen sprake van een impliciet doorvalresultaat: elk bereikbaar pad in een niet-`unit`
functie moet het gedeclareerde type retourneren. De bootstrapcontrole rapporteert terug
typefouten; Bereikbaarheidsanalyse is een vereiste follow-up voordat u een
compiler volledig v1-conform.

## Moduleaangiften en exporten

Alleen verklaringen voorafgegaan door `export` zijn openbaar. Exportnamen zijn stabiel,
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
`clock.now`, `random.bytes`, of `storage.read`. Mogelijkheidsnamen zijn eigendom van
het platform, en elke naam heeft een handtekening met een afzonderlijke versie. DOM-objecten,
`window`, `document`, Node ingebouwde ins, netwerkclients en andere globale browsers
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
laadtijd `CapabilityDenied` val; ze worden niet `undefined` of een
stille no-op.

## Waarden, lineair geheugen en eigendom

De module maakt gebruik van één WebAssembly lineair geheugen met 64 KiB-pagina's en little-endian
scalaire waarden. Scalaire waarden worden als volgt toegewezen:

| Webscript smeden | WebAssembly-vertegenwoordiging |
| ----------------- | ------------------------------------------ |
| `bool`            | `i32`, waar `0` is vals en `1` is waar |
| `i32`, `u32`      | `i32`                                      |
| `i64`, `u64`      | `i64`                                      |
| `f32`, `f64`      | bijpassende WebAssembly vlotter |
| `unit`            | geen resultaatwaarde |
| `string`, `bytes` | twee `u32` waarden: pointer en vervolgens bytelengte |

Het manifest declareert dezelfde mapping in `valueRepresentations`. EEN
Het wijzerlengtepaar wordt altijd gecontroleerd als een niet-ondertekend bereik voordat of wordt gelezen
schrijven: `pointer <= memory.byteLength` En `length <= byteLength - pointer`.
De nullengte is geldig en kan elke in-bounds-aanwijzer gebruiken, inclusief het einde van
geheugen. Een mislukte controle loopt vast `MemoryOutOfBounds` en stelt nooit een bloot
gedeeltelijk gedecodeerde waarde.

De gegenereerde module wordt geëxporteerd `fws_alloc(size: u32) -> u32` En
`fws_dealloc(pointer: u32, size: u32) -> unit` als eigendomsgrens
buffers. De beller die een buffer toewijst, is eigenaar ervan en moet de toewijzing ervan ongedaan maken
gebruik van dezelfde module. Hostimplementaties moeten invoerbytes kopiëren vóór de
de gastoproep keert terug, tenzij het manifest expliciet een geleende toekomst introduceert
buffercontract. Gastcode mag geen aanwijzer van de host bevatten na een host
bel. Toewijzingsfoutvallen met `MemoryExhausted`; dubbel gratis en ongeldig
gratis val met `InvalidOwnership`.

Hostuitzonderingen worden geconverteerd naar `HostError` met de mogelijkheidsnaam en een
ondoorzichtige hostfoutcode. Gastvallen worden nooit omgezet in gewoon rendement
waarden. Hosts mogen trapdetails registreren, maar ze mogen geen geheimen of onbewerkte gegevens prijsgeven
browseruitzonderingen op niet-vertrouwde gastcode.

## Duidelijk formaat

Elke gegenereerde module heeft naast zijn stabiele JSON-compatibele ABI-manifest
WASM-artefact en getypte ESM-lader:

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

Het daadwerkelijke manifest bevat niet alleen alle primitieve representatiegegevens
die in het voorbeeld worden gebruikt. JSON-sleutels voor export, import en mogelijkheden zijn
stabiel bij herhaalde builds; bronkaarten en inhoudshashes worden uitgezonden door
de compileradapter en maken geen deel uit van het matchen van ABI-handtekeningen.

## Diagnostiek

Diagnostiek zijn gestructureerde records met `code`, `severity`, `phase`, `message`,
`fileName`, en een bron `span`; bruikbare records kunnen ook omvatten `hint`.
De fase is er één van `lex`, `parse`, `type-check`, of `abi`. Stabiele v1-code
gezinnen zijn onder meer:

| Codeer familie | Betekenis |
| ------------- | ------------------------------------------------------------ |
| `FWS-LEX-*`   | ongeldige tekens of niet-afgesloten tekenreeksen |
| `FWS-PARSE-*` | ongeldige syntaxis van module, declaratie, instructie of expressie |
| `FWS-TYPE-*`  | ongeldig primitief type, naam, operator, argument of return |
| `FWS-ABI-*`   | dubbele namen, geweigerde mogelijkheden, export of import |

Fouten voorkomen het genereren van artefacten. Waarschuwingen en informatieve diagnostiek doen dat wel
de semantiek niet veranderen. Diagnostische volgorde is bronvolgorde, gevolgd door fase
bestelling voor diagnostiek gekoppeld aan hetzelfde bereik. A Vite adapter moet behouden blijven
de stabiele code en spanwijdte bij het doorsturen van een fout naar Vite.

## Bootstrap-conformiteitscontract

Het doel van de bootstrap-compiler is opzettelijk kleiner dan het uiteindelijke doel
zelfgehoste compiler. Een programma bevindt zich in de bootstrap-subset als het er een gebruikt
module, de bovenstaande lexicale regels, primitieve typen, `string`/`bytes` waarden,
expliciet geëxporteerde functies, import van mogelijkheden, lokale aangiften, oproepen,
uitdrukkingen, `if`/`else`, En `return`. Het mag niet afhankelijk zijn van iets impliciet
browser of Node mondiaal.

`packages/forge-web-script/src/fixtures/bootstrap.ts` is het uitvoerbare bestand
conformiteitscorpus. Geaccepteerde armaturen moeten valideren zonder foutdiagnostiek;
afgewezen armaturen moeten hun vermelde stabiele diagnostische codes rapporteren en geldig zijn
bronomvang. Implementaties in andere talen kunnen hetzelfde armatuur gebruiken
vorm en vergelijk genormaliseerde AST's, diagnostiek en manifeste JSON. Het armatuur
suite is een conformiteitsdoel, geen implementatiespecifieke momentopname.

## Compatibiliteitsbeleid

Taal- en hoofdversies van ABI zijn standaard incompatibel. Een lader kan dit accepteren
dezelfde grote ABI met een hogere secundaire versie alleen wanneer de producent de
nieuwe velden zijn optioneel en de consument negeert onbekende velden veilig. Het verwijderen van een
exporteren, een type wijzigen, van eigenaar veranderen of een mogelijkheid wijzigen
handtekening vereist een hoofdversie van ABI. Nooit stilletjes een mogelijkheid toevoegen
verandert een bestaande module: het vereist een nieuwe manifestdeclaratie en host
goedkeuring.

Compilerversies zijn geen ABI-versies. Compilers moeten hun versie opnemen in
de compileerinvoer en artefact-hash, maar laders vergelijken de taal en ABI
versies plus de manifesthandtekening. Een mislukte compatibiliteitscontrole is een
laadtijddiagnostiek, geen runtime-fallback. Rust- en AssemblyScript-modules
zullen tijdens de co-existentie hun bestaande wrappers en ABI-contracten blijven gebruiken
periode; Forge Web Script herinterpreteert of vervangt ze niet.

## Routekaart voor bootstrap-naar-self-hosting

1. **Bootstrap-contract:** behoud de TypeScript lexer, parser, typecontrole,
   manifest builder, armaturen en diagnostiek als de uitvoerbare conformiteit
   doel. Voeg alleen een WASM-zender toe na geaccepteerde programma's en verkeerd ingedeelde invoer
   stabiel gedrag vertonen.
2. **Bootstrap-standaardbibliotheek:** implementeer deterministisch geheel getal/float
   bewerkingen, UTF-8 en byte-codecs, toewijzing en trap-propagatie zonder
   browser-API's. Test elke bewerking via de logische ABI en nephosts.
3. **Forge Web Script compiler subset:** implementeer de compiler in Forge Web
   Script dat alleen de geaccepteerde subset gebruikt, expliciete records voor de compilerstatus,
   byte/string-buffers en import van gedeclareerde mogelijkheden. De output moet passeren
   de TypeScript conformiteitscorpus byte-voor-byte waar deterministisch.
4. **Zelf-hostende uitbreiding:** voeg rijkere aggregaten, lussen, patroonmatching toe,
   diagnostische helpers, en incrementele compilatie alleen nadat elke functie is voltooid
   een versie-armatuur en een compatibel ABI-verhaal.

Self-hosting is een latere mijlpaal. De bootstrap-compiler brengt semantiek tot stand
compatibiliteit; het is geen belofte dat v1 zelf een productie kan samenstellen
compiler of dat bestaande Rust/AssemblyScript-workloads zullen worden herschreven.
