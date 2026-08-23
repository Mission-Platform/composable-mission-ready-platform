# Codescanner: plan voor verbetering van de nauwkeurigheid en migratierecord

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/code-scanner/docs/accuracy-improvement-plan.md: [packages/code-scanner/docs/accuracy-improvement-plan.md](../../accuracy-improvement-plan.md)
> Taal: Nederlands (nl)

Een plan om de leessnelheid van `@mission-platform/code-scanner` te verhogen op opnamen uit de echte wereld (uploads en live camerabeelden
frames) en om de scanpijplijn binnen één statisch gekoppeld Forge Web Script/WebAssembly-artefact te houden.

> **Huidige implementatie:** De scanner wordt geleverd als statisch gekoppelde scanner
> Maak een webscriptgrafiek onder `src/fws`, met een dynamisch bronmoduleprofiel
> beschikbaar voor onafhankelijk cachebare decodermodules. De Roest en krat
> onderstaande referenties betreffen uitsluitend de historische migratieherkomst; zij zijn
> geen runtime-afhankelijkheden verpakken of inputs bouwen.
>
> **Vooruitgang:** Fase 0 (verbrede tests met gegenereerde afbeeldingen), Fase 1 (verplaats de
> hele pijplijn in één artefact tijdens het proces) en **Fase 2** (adaptieve binarisatie + grijs
> subpixelbemonstering met Reed-Solomon-uitwissingen + de locator↔decoder opnieuw proberen
> lus) zijn **klaar** — zie §1, §2 en §4. **Fase 3 is nu voltooid:** de UPC-A /
> EAN-13 ondubbelzinnig maken (§2 item 5), Data Matrix + 1D rotatie/skew-tolerantie
> (item 4), de Azteken-locator (item 6) en multi-symbool + ROI-scannen (item 7)
> zijn allemaal geland.

De oorspronkelijke implementatie splitste de pijplijn:

- **Locate + sample** uitgevoerd in een oudere native/wasm-pijplijn: `binarize` → per-symbologie-locators. Het `scan`-toegangspunt
  heeft een **gelabelde buffer** `[format, ...payload]` geretourneerd — deze heeft **niet** gedecodeerd.
- **Decode** draaide in JavaScript en riep afzonderlijke decodermodules aan.

Fase 1 verving dat door een enkele FWS `scan_and_decode`-oproep (zie §1); de
historische motivatie hieronder wordt als grondgedachte aangehouden, terwijl de huidige bron van
De waarheid is de FWS-grafiek en de bijbehorende Vitest-conformiteitssuite.

## 1. Het structurele kernprobleem: de pijpleiding passeerde tweemaal de wasm↔JS-grens

Vóór fase 1 was een enkele scan:

```
image (JS)
  → wasm code-scan.scan()            [Rust: binarise + locate + sample]
  → tagged module buffer (JS)        [cross back into JS]
  → decodeQr / decodeMatrix / decodeBarcode (JS façades)
  → wasm qr/matrix/barcode-decode    [cross into a *different* wasm module]
  → payload string (JS)
```

Elk gelokaliseerd symbool wordt uit wasm gekopieerd, opnieuw vormgegeven in JS en vervolgens gekopieerd naar een tweede wasm-instantie om te decoderen. Dit is
de heen- en terugreis die de kwestie oproept. Het schaadt zowel de prestaties als, nog belangrijker voor dit plan, de **nauwkeurigheid**, omdat
de kabelzoeker en de decoder kunnen niet samenwerken:

- **Geen decoderingsfeedback naar de locator.** De Rust-locator verbindt zich tot een _single_
  binarisatie, symboolgrootte en moduleraster. Als het bemonsterde raster niet voldoet aan Reed-Solomon/checksum in de JS-decoder, is dat het geval
  er is geen manier om de plaatsbepaler te vragen om opnieuw te bemonsteren met een andere drempel, een modulegrootte van ±1 of een verschoven oorsprong. Een code die
  is _gelokaliseerd maar niet-decodeerbaar_ (precies het geval waarin de foutopsporingsregistratie zich richt)
  gaat gewoon verloren.
- **Hand-off met verlies.** De locator vlakt rijke tussenliggende toestanden af (grijsniveaus, middelpunten van kandidaatzoekers, per module
  vertrouwen) tot harde `0/1` bits voordat de decoder het ooit ziet. De decoder werkt dan alleen met bits.
- **Symbologievoorrang is een bot instrument.** Voor 1D-codes probeert de JS-kant symbologieën in een vaste volgorde en
  retourneert de eerste die leest. Omdat UPC-A een subset op moduleniveau is van een EAN-13 met voorloopnul, is een UPC-A-symbool
  gerapporteerd als EAN-13 (geverifieerd door de nieuwe testsuite). Door te decoderen in Rust kan de locator structurele hints bevatten (element
  tellen, bewakingspatronen) om de juiste symboliek te kiezen.

### Doelarchitectuur: één FWS-oproep, beeld erin, payload eruit

> **Status: geïmplementeerd.** De scanner exporteert `scan_and_decode`, koppelt de
> decoder FWS maakt rechtstreeks grafieken, en de JS-façade decodeert via die single
> bellen. In de onderstaande details wordt de reden voor de migratie vastgelegd.

```
image (JS)
  → FWS scanner.scan_and_decode()      [binarise + locate + sample + decode]
  → ScanOutcome { format, value } (JS)
```

`scan_and_decode(width, height, luma) -> Option<ScanOutcome>` voert de hele pijplijn uit binnen `src/fws/scanner.fws` en
retourneert de **gedecodeerde payload** rechtstreeks (`value` is leeg als een symbool zich bevindt maar niet kan worden gedecodeerd). De JS-gevel
(`scanner/index.ts`) is een dunne verzamellaag die de QR-, matrix- en barcode-FWS-bronnen tijdens het bouwen met elkaar verbindt;
die pakketten blijven onafhankelijk publiceerbaar.

#### Waarom dit nu bespreekbaar is

De decoderkratten laten al roestkernen en `crates/code-scan` zien
**koppelt ze al voor de eigen tests** (`tests/pipeline.rs`-aanroepen
`mission_platform_barcode_decode::decode_modules`,
`mission_platform_matrix_code_decode::decode`, enz.). De enige reden waarom ze beperkt zijn
`[target.'cfg(not(target_arch = "wasm32"))'.dev-dependencies]` betekent dat elke decoderkrat een
`#[wasm_bindgen] pub fn decode`, en het koppelen van een aantal daarvan in één cdylib zou botsen op de geëxporteerde `decode`
symbool.

De oplossing was een kleine, mechanische refactor – **alle vier de stappen zijn nu voltooid**:

1. **Elke decoder heeft een gewoon Rust-ingangspunt** dat _not_ `#[wasm_bindgen]` is
   (`decode_modules`, `decode_matrix`, `decode_qr`) en de `#[wasm_bindgen]`
   De export van `decode`/`start` vindt plaats achter een nieuwe kratfunctie `wasm-api` (standaard ingeschakeld en geïmpliceerd door `console`).
2. **`code-scan` is afhankelijk van de decoderkratten met `default-features = false`**
   (dus `wasm-api` is uitgeschakeld), gepromoveerd van ontwikkelaarsafhankelijkheden naar echte afhankelijkheden. Er is geen wasm-bindgen `decode`-symbool
   gecompileerd in de scanner cdylib, dus er is geen botsing - geverifieerd door de scanner wasm opnieuw op te bouwen.
3. **`scan_and_decode`** in `crates/code-scan/src/lib.rs` lokaliseert de gewone Rust-kernen van de decoders en roept deze aan
   en retourneert een `ScanOutcome {-formaat,
waarde }` (a `#[wasm_bindgen]` struct; `value` is `undefined` indien niet-decodeerbaar).
4. **De JS-façade is afgeslankt**: de `decodeTagged`-routing en de import van de drie decoderpakketten zijn verdwenen,
   vervangen door een enkele `scan_and_decode`-oproep.

Dit is de noodzakelijke stap voor elke onderstaande nauwkeurigheidsverbetering, omdat lokaliseren en decoderen nu één adresruimte delen.

## 2. Nauwkeurigheidsverbeteringen ontgrendeld zodra de decodering in Rust is

Ruwweg gerangschikt op basis van de verwachte impact op de leessnelheid. **Onderdelen 1–3 (Fase 2) en onderdelen 4–7 (Fase 3) zijn klaar**; elk is
hieronder geannoteerd.

1. **Locator ↔ decoder opnieuw proberen. _(klaar — Fase 2.)_** Wanneer de eerste decoderingspoging mislukt, `scan_and_decode`
   bemonstert opnieuw zonder Rust te verlaten: het probeert een tweede (adaptieve) binarisatie, de oorsprong van de submodule verschuift
   (`SAMPLE_OFFSETS`), en zowel wisbewuste als blinde decodering, waarbij de eerste kandidaat wordt geaccepteerd die aan de eisen van het symbool voldoet
   eigen foutcorrectie. Dit valt rechtstreeks de _gelokaliseerde maar niet-decodeerbare_ fouten aan.
2. **Lokale/adaptieve binarisatie. _(klaar — Fase 2.)_** `image::binarize` (wereldwijd **Otsu**) wordt behouden als de snelle eerste
   poging; `image::binarize_adaptive` voegt een **lokale gemiddelde-C**-drempel met vensters toe (via een integraal beeld) zodat schittering,
   hellingen en ongelijkmatige verlichting laten donkere modules niet langer opgaan in de achtergrond. De retry-lus probeert beide.
3. **Modulebemonstering op grijsniveau (subpixel). _(klaar — Fase 2.)_** `qr` en
   `datamatrix` heeft `scan_with_confidence` verkregen, dat modulecentra bemonstert uit de _grijze_ afbeelding met bilineaire
   interpolatie en markeert modules nabij de lokale drempel als weinig vertrouwen. Deze worden doorgegeven aan de decoders
   (`decode_qr_with_erasures` / `decode_matrix_with_erasures`) terwijl Reed–Solomon **wist**, wat de
   Corrector voor fouten en verwijderingen (`gf`, `reed_solomon`)
   reparaties tot tweemaal zo vaak als bij onbekende fouten.
4. **Multi-schaal + rotatierobuustheid voor 1D en datamatrix. _(klaar — Fase 3.)_** De QR-locator was al aanwezig
   rotatietolerant via de drie vindercentra. Data Matrix leest nu bij **elke** rotatie: een op hoeken gebaseerde affiene
   locator (`scan_oriented_candidates` — vier extreme inkthoeken, de L-hoek gedetecteerd vanaf de solid-randen, de
   tegenoverliggende hoek gereconstrueerd door de parallellogramregel, grootte afgelezen van de timingranden, onafhankelijk bemonsterd
   kolom-/rijassen, zodat ook afschuiving wordt verwerkt)
   bestrijkt gematigde hoeken, en een terugval voor rechttrekken en opnieuw proberen herstelt steile hoeken: `Bitmap::orientation` vindt de
   rotatie via een grensvak met een minimaal oppervlak (robuust in de 45 °-familie, waar uiterste punthoeken degenereren),
   `image::rotate_luma` maakt het frame recht en de afgestemde rechtopstaande pijpleiding bemonstert het. 1D-barcodes worden verwerkt
   op dezelfde manier: de kanteling wordt hersteld en het frame wordt rechtgetrokken (alle vier as-uitlijningsoriëntaties geprobeerd), zodat de
   horizontale scanlijnen kruisen de staven. Gedekt door geroteerde pijpleidingtests over verschillende hoeken (incl.
   45°/90°/180°+) en de versterkte JS-degradatieprofielen.
5. **Ondubbelzinnig maken van symbolen voor 1D. _(klaar — Fase 3.)_** De dubbelzinnigheid tussen UPC-A en leidende-nul-EAN-13 wordt opgelost door
   het **nummersysteemcijfer**:
   `decode_any_barcode` verwerkt de winnende symbologie na
   `disambiguate_symbology`, die een EAN-13 rapporteert waarvan het nummersysteemcijfer is
   `0` als het 12-cijferige UPC-A-formulier (voorloopnul verwijderd), terwijl echte EAN-13 onaangeroerd blijft. _Resterend:_ dragen
   rijker gelegen structuur (posities van de beschermbalken, aantal elementen) in de beslissing en legt de beoogde symboliek bloot
   zodat bellers dit kunnen beperken.
6. **Azteekse ondersteuning. _(klaar — Fase 3.)_** De `@mission-platform/matrix-code`
   encoder produceerde al Aztec, maar de scanner had geen Aztec _locator_. Een compacte Azteekse bullseye-locator toegevoegd
   (`crates/code-scan/src/aztec.rs`): het vindt de centrale roos door zijn negen-run `1:1:1:1:1:1:1:1:1` vinderhandtekening
   (binnenste zeven runs vertrouwd, buitenste twee alleen vereist aanwezig omdat ze de modusring raken), verifieert het op beide assen,
   herstelt de modulegrootte, bemonstert elk plausibel compact formaat (15/19/23/27) op een gespikkelde kopie en routeert elk
   naar het bestaande Azteekse decodeerpad, waarvan de mode-message + Reed-Solomon-controles de verkeerde formaten afwijzen. `scan_and_decode`
   rapporteert dit als `FORMAT_AZTEC`.
7. **Meerdere symbolen + ROI-scannen. _(klaar — Fase 3.)_** `scan_and_decode_all`
   retourneert elk afzonderlijk gedecodeerd symbool (een grof-naar-fijn bereik van het hele frame, overlappende helften en kwadranten,
   gededupliceerd door `(format, value)`), en
   `scan_and_decode_roi` snijdt een door de beller aangeleverde regio bij **in Rust vóór**
   binarisatie, dus een dradenkruisuitsnede wijst de omringende rommel van tevoren af. Beide zijn zichtbaar in de JS-gevel
   (`scanImageDataAll`, `scanImageData(image, roi)`).

## 3. Validatiestrategie

Nauwkeurigheidswerk moet worden gemeten en niet met het oog worden bevestigd.

- **Tests met gegenereerde afbeeldingen.**
  `src/scanner/index.spec.ts` geeft veel encoderuitgangen weer: vijf QR-payloads in verschillende formaten/UTF-8 plus alle vier de ECC
  niveaus, vier Data Matrix-payloads en zeven 1D-symbologieën (`code128`, `code39`, `ean13`, `ean8`, `upca`, `itf`,
  `codabar`) — en geeft het volledige `render → locate → sample → decode`-pad weer (nu het enige
  `scan_and_decode`-oproep) herstelt de payload. De 1D-gevallen vergelijken zich met de eigen symbologievoorrang van de scanner
  (inclusief het ondubbelzinnig maken van UPC-A/EAN-13).
- **Alle codetypen coderen↔decoderen retour.** `crates/code-scan/tests/generated.rs`
  codeert **elke** symboliek die de encoders kunnen produceren: QR (4 ECC-niveaus), alle vier de matrixsymboliek (Data Matrix
  vierkant/rechthoekig, GS1 Data Matrix, Aztec)
  en alle vijftien 1D-symbologieën (inclusief Code 93, GS1-128, UPC-E, ITF-14, MSI, Pharmacode) - en beweert dat ze allemaal decoderen
  getrouw (hercodeer gelijkheid), met betrekking tot de codetypen die de scanner nog niet kan _lokaliseren_.
- **Fase 2 degradatiegevallen.** `image.rs` unit test adaptieve binarisatie op een lichtgradiënt; `tests/pipeline.rs`
  bewijst dat een door gradiënt gedegradeerde QR die het globale Otsu-only pad niet kan lezen, wordt hersteld door de Phase 2 adaptive +
  grijze bemonsteringspijplijn; de RS-kratten testen fouten en wissen herstel dat verder gaat dan het vermogen tot blinde fouten.
- **Verslechtering van de opname per formaat.** Elk gegenereerd beeld wordt vervormd door een deterministisch **projectief**
  transformatie — niet-uniforme aspectschaal, rotatie, scheefheid en een onafhankelijke per-hoek x/y/z **morph** (een homografie) —
  plus zout-en-pepergeluid, vóór het scannen. De intensiteiten worden per formaat afgestemd, waarbij twee locatorlimieten worden gekwantificeerd
  waard om te repareren (zie §2): het op de vinder gebaseerde raster van QR is alleen affiene, dus het tolereert slechts een mild _anisotropisch_ aspect en
  _perspectief_ voordat grotere symbolen wegdrijven; de Data Matrix-locator kan alleen rechtop staan en verdraagt dus slechts een klein beetje
  rotatie/skew/morph.
- **Degradatiematrix.** De Rust `tests/pipeline.rs` degradeert al synthetische vangsten (downscale, zout-en-peper
  spikkel, rommel in de rustige zone, rommelig
  "cameraframe"). Breid dit uit naar een parameter sweep (schaal × ruis × rotatie × vervaging) en rapporteer een **leessnelheid
  percentage per formaat**, gecodeerd in CI, zodat een wijziging deze niet stilletjes kan terugdraaien.
- **Real-capture corpus.** Verzamel een vaste set echte foto's (de veldrapporten verwijzen naar 448×336 frames met lage resolutie
  en ~3px/module barcodes) met bekende payloads, en houd de leessnelheid bij als de belangrijkste statistiek voor alle releases.
- **Determinisme.** Houd alle synthetische afbraak in de kiem (het bestaande `speckle`
  gebruikt een vaste LCG) zodat de resultaten reproduceerbaar zijn.

## 4. Aanbevolen volgorde

1. **Fase 0 — tests (klaar).** De reeks gegenereerde afbeeldingen uitgebreid (met geplaatst aspect/rotatie/skew/morph/noise
   degradatie) zodat de pijpleiding een vangnet had vóór refactoring.
2. **Fase 1 — consolideer de decodering in Rust (klaar).** De afhankelijkheid/functie-refactor + `scan_and_decode` + JS-façade
   afslanken. Gedragsbehoud; gevalideerd door de round-trip-, pijplijn- en nieuwe `scan_and_decode`-tests, en door
   het opnieuw opbouwen van de scanner was.
3. **Fase 2 — binarisatie + subpixelsampling + herhalingslus (klaar).** Adaptieve lokale binarisatie, grijs bilineair
   bemonstering met vertrouwen per module dat aan de decoders wordt toegevoerd als Reed-Solomon-uitwissingen, en de globale → adaptieve ×
   wissen/blind × oorsprong-offset opnieuw proberen in `scan_and_decode` — de grootste leessnelheid wint, nu lokaliseren en
   decoderen, samenwerken in één Rust-oproep.
4. **Fase 3 — rotatie/skew, ondubbelzinnig maken van symboliek, Azteeks, multi-symbool (in uitvoering).** De 1D-symboliek
   ondubbelzinnigheid (§2 item 5) is geland. Resterend:
   Data Matrix/1D rotatie-skew-tolerantie (item 4), een Azteekse locator (item 6) en scannen met meerdere symbolen + ROI (item 7) - elk belandde achter zijn eigen degradatiematrixdelta.

## 5. Documentatieopvolgingen

- **Klaar:** `packages/code-scanner/README.md` is bijgewerkt - de verouderde "1D-barcodedecoder is nog steeds een steiger, dus
  streepjescoderesultaten dragen `value: null`" opmerking is vervangen door het end-to-end decoderingsgedrag (decodering van streepjescodes; UPC-A
  rapporteert als zijn 12-cijferige waarde, niet als zijn EAN-13-alias), en het architectuurgedeelte beschrijft nu de enkele
  `scan_and_decode`-aanroep in plaats van de JS-decoderingsoverdracht.

## 6. ZXING black-box corpusharnas (leessnelheid bij real-capture)

Het `tests/real_world.rs` "corpus" van §3 werd gerealiseerd als het volledige **ZXing blackbox** corpus (1.242 PNG's verdeeld over 56
symbologiemappen, elk met een `.txt`
verwachte waarde; Apache-2.0, verkocht onder
`crates/code-scan/tests/fixtures/zxing-blackbox/` met attributie). Een harnas in ZXing-stijl
(`crates/code-scan/tests/blackbox.rs`) voert de hele native versie uit
`scan_and_decode` pijplijn over elk beeld met de vier kwartslagrotaties (0/90/180/270) en vergelijkt elk beeld
per map, aantal rotaties per rotatie ten opzichte van een vastgelegde basislijn (`tests/blackbox_baseline.toml`), alleen mislukt op een
_regressie_ — zodat onherstelbare uitschieters de voortgang nooit blokkeren terwijl echte overwinningen worden gemeten. `falsepositives*` /
`unsupported`-mappen zijn de omgekeerde bewaker: hun basislijn is een _plafond_ voor valse positieven.

### Stap 1 — corpus + gegeneraliseerde lader + harnas _(klaar)_

Het corpus is verkocht, de PNG-lezer is gegeneraliseerd (`tests/support/png.rs`:
paletkleurtype 3 bij diepten 1/2/4/8, grijstinten met lage diepte, RGB (A), grijs+alfa, plus 90/180/270 rotatiehulpmiddelen
matching van de ZXing-semantiek) met een loader unit-test (`tests/png_loader.rs`), en de basislijn wordt vastgelegd.

### Stap 2 — verhoog de leessnelheid voor ondersteunde formaten _(in uitvoering)_

Triage (classificatie per map van elke afbeelding/rotatie als gedecodeerd / verkeerde waarde / gelokaliseerd maar niet gedecodeerd /
niet-gelokaliseerd) liet een duidelijk patroon zien:
de pijplijn **lokaliseert nu bijna alles** maar **decodeert alleen de schone opnames**. De overige mislukkingen zijn dat wel
overweldigend _gelokaliseerd-maar-niet-gedecodeerd_, niet _niet-gelokaliseerd_.

**Deze stap geland:**

- **ITF false-positive guard.** Interleaved-2-of-5 heeft geen controlecijfer en een triviale start/stop, dus een kruising van de scanlijn
  een niet-gerelateerd symbool (een QR, andere balken) dat triviaal is "gedecodeerd" tot een valse waarde van 2 of 4 cijfers. `itf::decode` nu
  wijst payloads af die korter zijn dan **zes cijfers**, wat overeenkomt met de ondergrens van ZXing's `ITFReader::DEFAULT_ALLOWED_LENGTHS`
  (`{6,8,10,12,14}`). Dit zorgde ervoor dat de valse positieven in `falsepositives`, `falsepositives-2` en `unsupported` naar
  **nul** en door het verwijderen van de korte leesbewerkingen die de prioriteitsvolgorde kortsloten, werden verschillende positieve waarden opgeheven
  mappen (bijvoorbeeld `qrcode-4`, `qrcode-5`). Gedekt door een nieuwe regressietest (`barcode-decode`:
  `itf_rejects_runs_shorter_than_six_digits`) en de basislijnupdate.

**Gekwantificeerde volgende kansen (gelokaliseerd, nog niet gedecodeerd):**

- **1D-decodering per cijfer (grootste mogelijkheid).** UPC/EAN-mappen lokaliseren honderden scanlijnen, maar decoderen bijna
  geen van de harde camerafoto's (`upca-2` 206 gelokaliseerd / 0 gedecodeerd, `upce-2` 160 / 0, `ean13-3` 204 / 6). De grondoorzaak
  is dat de locator elke scanlijn kwantiseert naar een **enkele globale module-eenheid** voordat de modulebits aan de
  decoder; bij perspectiefverkorting varieert de werkelijke modulebreedte over het symbool, waardoor het globale raster afwijkt
  en een rigide EAN/UPC-celraster wijst dit af. De oplossing is een **per-cijferige** rijdecoder in ZXing-stijl die overeenkomt met de rijen van elk cijfer
  run-length verhoudingen lokaal (patroon-match variantie) in plaats van een globale kwantisering – een grotere verandering in de
  locator↔decoder-interface, bijgehouden als de volgende stap-2-iteratie.
- **QR-perspectief / uitlijningspatroonbemonstering.** `qrcode-1` (77 gelokaliseerd / 0 gedecodeerd) en `qrcode-6` (60 / 0) zijn
  symbolen van hogere versies: de sampler bouwt een puur **affien** raster op van de drie vindercentra, dat over de grenzen heen drijft
  een groot of perspectief-verwrongen symbool. Met behulp van het **uitlijningspatroon** rechtsonder
  voor een vierpuntsperspectieftransformatie (zoals ZXing's `Detector` doet) is de bijbehorende QR-overwinning.
- **Datamatrix-grootte + polariteit.** De enkele `inverted`-datamatrix bevindt zich nu na een omkering van de polariteit, maar
  verkeerde afmetingen door de locator (22 × 22 voor een numeriek symbool van 10 cijfers waarvan de werkelijke grootte ~ 12–14 is), zodat het niet wordt gedecodeerd; een
  Er werd een prototype gemaakt van een poging tot volledige frame-omgekeerde polariteit, maar deze werd voor deze stap teruggedraaid omdat hierdoor de corpus-sweep-tijd werd verdubbeld
  voor nul netto corpuswinsten (de blokkering is de DM-grootte, niet de polariteit). Omgekeerde ondersteuning zou moeten terugkeren zodra de DM-locator is bereikt
  De maatvoering is aangescherpt, zodat de extra pas alleen werkt op frames die anders zouden falen.
- **Azteekse bemonstering.** `aztec-1` (68 gelokaliseerd / 0 gedecodeerd): de roos is gevonden, maar de as-uitgelijnde rasterbemonstering wel
  hebben deze vangsten nog niet teruggevonden.

### Stap 3 — GS1 DataBar (RSS-14) coderen + decoderen + locator _(RSS-14 klaar)_

Een nieuw krattrio weerspiegelt de `*-common` / `*-encode` / `*-decode`-splitsing van de repository:

- **`gs1-databar-common`** — de ISO/IEC 24724 combinatorische primitieven geporteerd van ZXing's `RSSUtils`: `combins`,
  `get_rss_value` (breedtes → waarde, decoderen) en de exacte inverse `get_rss_widths` (waarde → breedtes, coderen), plus de
  breedte-verhouding variantiezoeker matcher. Een unit-test beweert dat de waarde/breedte-toewijzing voor elke RSS-14 zelf-invers is
  deelverzameling.
- **`gs1-databar-decode`** — een getrouwe port van ZXing's `RSS14Reader`: vinderdetectie, `parseFoundFinderPattern`,
  `decodeDataCharacter` (met de oneven/even-tellingsaanpassing) en de mod-79-checksum, die de 14-cijferige GTIN reconstrueert.
  Omdat DataBar-tekens worden gedecodeerd vanuit elementbreedte _ratios_ (niet een vast glyph-raster), leest de rijdecoder run
  lengtes direct buiten een scanlijn - dus tolereert het de variërende modulebreedte van een verkorte opname die verslaat
  het globale kwantiserings-1D-pad (§2).
- **`gs1-databar-encode`** — de waarde →module-bit inverse. De fysieke indeling (beschermbeugel, buiten-/zoeker-/binnenelement
  volgorde en het omgekeerde binnen/rechts-paar) werd vastgezet door de gemeten elementbreedtes van de decoder te vergelijken van a
  echt corpussymbool tegen de berekende karakters van de encoder, vervolgens bevestigd door een retour-encode → decode.

De scanner heeft er `crates/code-scan/src/gs1_databar.rs` bij gekregen, een dunne locator die veelbelovende scanlijnen levert
(drukste overgangsrijen, vervolgens kolommen voor 90°/270°-opnamen) naar de rijdecoder; de sterke RSS-14-checksum maakt een
match gezaghebbend, dus het rapporteert alleen een gedecodeerde waarde of niets (waardoor de fout-positieve beveiliging schoon blijft). Het is bedraad
in `scan_and_decode` als nieuw
`FORMAT_DATABAR`-tag (waarbij `FORMAT_PDF417` / `FORMAT_MAXICODE` gereserveerd is voor latere stappen).

**Resultaat:** de corpusmappen `rss14-1` en `rss14-2` zijn gewijzigd van **0 → 16**
correcte decodering over de vier rotaties (rijen lezen 0°/180°, kolommen lezen 90°/270°), met **geen regressie** in welke
andere map en de negatieve mappen staan nog steeds op **nul** valse positieven. Retourreizen vallen onder de dekking
`gs1-databar-decode/tests/roundtrip.rs` en `code-scan/tests/generated.rs`.

**Volgende DataBar-iteratie:** GS1 DataBar **Expanded** en **Expanded-Stacked**
(`rssexpanded-*`, `rssexpandedstacked-*`) zijn een afzonderlijke, grotere decoder (een AI/veldparser voor algemene doeleinden plus
montage in gestapelde rijen) en blijven op basislijn 0, gevolgd als vervolg op deze stap. RSS-14 **Gestapeld** heeft eveneens behoefte
tweerijige montage in de locator.

### Stap 4 — PDF417 coderen + decoderen + gestapelde rij-locator _(klaar)_

Een nieuw krattrio weerspiegelt de `*-common` / `*-encode` / `*-decode`-splitsing van de repository, met overdracht van `com.google.zxing.pdf417.*`
(Apache-2.0):

- **`pdf417-common`** — de gedeelde tabellen en wiskunde die beide kanten nodig hebben: het symbool ↔ codewoordtabellen (2.787 vermeldingen,
  gegenereerd op basis van de ZXing-referentie), de codewoord-/clusterzoekopdrachten (`get_codeword`, `bucket_from_symbol`), de
  module-bit-count → symboolsampler (exact snel pad plus een lui gebouwde terugval met de dichtstbijzijnde verhouding), en de **GF (929)
  Reed-Solomon** foutcorrectiedecoder (`ModulusGF` / `ModulusPoly` / Euclidisch algoritme). Een eenheidstest bevestigt alles
  codewoordwaarde heeft een symbool in elk van de drie clusters en retouren.
- **`pdf417-decode`** — GF (929) EC-correctie plus een bitstream-parser op hoog niveau (`DecodedBitStreamParser`) die
  **Tekst**, **Byte** en **Numeriek**
  verdichting. Het verbruikt de platte codewoordarray die de locator assembleert en retourneert de payload.
- **`pdf417-encode`** — een byte-compactie-encoder (elke byte-payload precies heen en terug), afmetingen, de
  EC-codewoordgenerator (`EC_COEFFICIENTS` voor alle negen EC-niveaus, gegenereerd op basis van de referentie) en de modulematrix
  lay-out (start/stop-beveiligingen, rij-indicatoren links/rechts). Het onthult zowel de codewoordarray (voor codewoordniveau
  round-trips) en de ingepakte module-bitmap (voor beeldpadtests).

De scanner heeft `crates/code-scan/src/pdf417.rs` verkregen. PDF417 is een _gestapelde lineaire_
symbologie, zodat de locator scanregel voor scan werkt: op elke beeldrij vindt hij de startwachter, leest 17-module
codewoorden (elk 8 maten/spaties) tot aan de stopguard, stemmen over de kolom-/rijtelling/EC-niveau-metagegevens uit de rij
indicatoren, legt de datacodewoorden in een `rows × cols`-matrix (meerderheid gestemd per cel over de scanlijnen die
bedek elke rij streepjescodes) en overhandig deze aan de RS-gecontroleerde decoder. Bij een tweede passage wordt elke rij van rechts naar links gelezen, zodat a
180° gedraaid symbool decodeert nog steeds. Het is aangesloten op `scan_and_decode` als `FORMAT_PDF417`.

Twee robuustheidsdetails bleken essentieel:

- **Alleen exacte bemonstering in het hete pad.** De per-run-sampler gebruikt alleen de exacte overeenkomst
  (`sample_codeword_symbol_exact`); een run waarbij geen zuivere monsters worden genomen, wordt een `-1` _hole_ die de kolom behoudt
  uitlijning en wordt overgeslagen bij de stemming. Hierdoor blijft het scannen van elke rij van elke afbeelding goedkoop – de O (tabelgrootte)
  terugval met de dichtstbijzijnde ratio zou anders de corpus sweep domineren.
- **Een bescherming tegen gaten in de RS-overcorrectie.** Bij hoge EC-niveaus fabriceert Reed–Solomon graag een
  _valid-but-wrong_ codewoord uit een grotendeels lege assembly (waargenomen als afval dat `"AAAA…"` decodeert). De zoeker dus
  weigert te decoderen wanneer het aantal gaten `num_ec / 2` (het RS-correctiebudget) overschrijdt, waardoor **elke** wordt verwijderd
  garbage decodeert met behoud van alle correcte - en houdt de vals-positieve bewaker van de negatieve map schoon.

Een bug die onderweg is verholpen: de standaardarm van de bitstream-parser kon voor altijd op een beschadigde stream blijven draaien (tekst opnieuw uitvoeren
verdichting op een codewoord dat het niet kan consumeren); het gaat nu op borgtocht af als het geen vooruitgang boekt.

**Resultaat:** `pdf417-1` / `pdf417-2` / `pdf417-3` ging van **0 → 8 / 13 / 8**
correcte decodering bij rotatie 0, en opnieuw bij 180° (**58** correct over rotaties), met **geen regressie** in andere
map en de negatieve mappen staan nog steeds op **nul** valse positieven. Retourreizen vallen onder de dekking
`pdf417-decode/tests/roundtrip.rs` en `code-scan/tests/generated.rs`, en het volledige afbeeldingspad (coderen → renderen →
`scan_and_decode`, incl. 180°) bij
`code-scan/tests/pipeline.rs`.

**Volgende PDF417-iteratie:** rotaties **90°/270°** blijven op basislijn 0 — een kwartgedraaid symbool wordt weergegeven als verticale balken
dat de rijscanlocator niet leest. Een kolomscan (transponeer) pas, of het harnas dat het getransponeerde frame voedt, is dat wel
het bijpassende vervolg. Voor een steilere scheefheid is het volledige ZXing `Detector`-perspectiefmodel met vier hoeken nodig.

### Stap 5 — MaxiCode coderen + decoderen + zeshoekige locator _(klaar)_

Een nieuw krattrio weerspiegelt de `*-common` / `*-encode` / `*-decode`-splitsing van de repository, met overdracht van `com.google.zxing.maxicode.*`
(Apache-2.0):

- **`maxicode-common`** — de gedeelde primitieven die beide zijden nodig hebben: de vaste symboolgeometrie (30 kolommen × 33 rijen), de
  **`BITNR`** per cel → codewoord-bit map (poort van ZXing's `BitMatrixParser.BITNR`, getranscribeerd en unit-getest zodat elke
  van de 864 databits komt precies één keer voor), de `read_codewords` / `place_codewords`
  invers paar, en de **GF (64) Reed-Solomon** corrector (primitieve `x⁶+x+1`, generatorbasis 1) met alleen fouten
  Berlekamp–Massey/Chien/Forney. Eenheidstests omvatten een schoon codewoord, correctie tot de helft van de EG-begroting, en een
  onherstelbaar blok.
- **`maxicode-decode`** — een trouwe port van ZXing's `Decoder` +
  `DecodedBitStreamParser`: corrigeert het primaire blok (10 data + 10 EC als geheel) en het secundaire blok (even/oneven
  interleaves worden onafhankelijk gecorrigeerd), leest de modusnibble, stelt de datawoorden samen en voert de vijf sets uit
  (`SETS[0..5]`) grendel/shift/nummer-compactiestroom, inclusief de modus 2/3 gestructureerde drager
  postcode/land/dienstklasse montage. Omdat alle drie de RS-blokken moeten valideren, is een geretourneerde waarde gezaghebbend.
- **`maxicode-encode`** — een afhankelijkheidsvrije targetingmodus voor schrijvers 4/5 met de primaire tekensets A en B (genoeg om
  codeer ASCII-payloads en zaai de retourvluchten), genereer de primaire + interleaved-secundaire EC en leg de 144
  codewoorden in het moduleraster via de gedeelde `BITNR`-kaart.

De scanner heeft `crates/code-scan/src/maxicode.rs` verkregen. MaxiCode wordt gelezen als een puur symbool, precies zoals dat van ZXing
`MaxiCodeReader` doet dat: de locator neemt de omsluitende rechthoek van de donkere pixels en bemonstert het vaste raster van 30×33
eroverheen, waarbij de x-positie van het monster een halve module op oneven rijen wordt verschoven om de zeshoekige offset te volgen. Een goedkoop vierkant aspect
De bewaker slaat duidelijk niet-MaxiCode-gebieden (1D-streepjescodes, hoge labels) over voordat er monsters worden genomen, en de drie RS-blokken weigeren
elke niet-MaxiCode-afbeelding die op deze manier is bemonsterd. Het is aangesloten op `scan_and_decode` als
`FORMAT_MAXICODE`.

**Resultaat:** de map `maxicode-1` ging van **0 → 9** correcte decodering bij rotatie 0 (alle negen afbeeldingen — modi 2-5 en
het foutgeïnjecteerde monster), met **geen regressie** in een andere map en de negatieve mappen staan nog steeds op **nul**
valse positieven. Retourreizen vallen onder `maxicode-decode/tests/roundtrip.rs`
(coderen → moduleraster → decoderen, incl. RS-foutherstel) en
`code-scan/tests/generated.rs`.

**Volgende MaxiCode-iteratie:** net als ZXing staat de pure-bits-sampler alleen rechtop, dus rotaties **90°/180°/270°** blijven op
basislijn 0 (een geroteerd symbool bemonstert het zeshoekige raster verkeerd en RS wijst het af - geen valse positieven). Een roos
vinder die de rotatie van het symbool herstelt voordat de bemonstering de andere drie rotaties zou opheffen.

### Stap 6 — sluit de nieuwe formaten aan op de JS-gevel + bouw het FWS-artefact _(klaar)_

Stappen 3–5 brachten PDF417, GS1 DataBar (RSS-14) en MaxiCode in de scanner
pijpleiding achter de tags `FORMAT_PDF417` / `FORMAT_DATABAR` / `FORMAT_MAXICODE`, terwijl de JS-façade alleen de
originele vier formaten. Met deze stap worden de nieuwe symbologieën tijdens runtime zichtbaar:

- **`FORMAT_NAMES`** in `src/scanner/index.ts` brengt nu `4 → 'pdf417'` in kaart,
  `5 → 'databar'`, `6 → 'maxicode'` en de `ScanFormat`-vereniging in `src/types.ts`
  krijgt dezelfde drie namen — dus `scanImageData` / `scanImageDataAsync` (en de
  `*All` / ROI-varianten) retourneert ze zoals elk ander formaat.
- **Het FWS-artefact van de scanner is gebouwd** van `src/fws/scanner.fws` door de Forge Web Script Vite-plug-in. Het statische profiel
  koppelt de decodergrafieken tot één op zichzelf staand artefact, maakt WebAssembly SIMD mogelijk en past agressieve linktijd toe
  optimalisatie; het dynamische profiel behoudt expliciete grenzen van de decodermodule en cachet exportverzending.
- **De FWS-grafiek- en gevelsuites** (`src/fws/scanner-graph.spec.ts` en
  `src/scanner/index.spec.ts`) oefen de gekoppelde decodergrafieken uit via de
  scanner ABI en beide openbare toegangspunten, waaronder PDF417, GS1 DataBar,
  MaxiCode, ROI, multi-resultaat, synchrone en asynchrone paden. De
  package-local PDF417-tekstfixatie houdt het conformiteitsgeval onafhankelijk van
  de gepensioneerde native corpuswerkruimte.

**Resultaat:** `vitest` is groen tegenover het FWS-artefact en de `tsc`-build
cheque is schoon. De ondersteunde gezinnen blijven volledig gedekt door de
grafiek- en openbare gevelsuites, en de modellagen per fase die de leidraad vormden
inspanning is gedocumenteerd in `docs/model-cost-strategy.md`.

### Stap 7 — ZXing-stijl 1D-rijdecoder per cijfer voor camera UPC/EAN-foto's _(klaar)_

De dominante resterende corpusfoutmodus was **gelokaliseerde maar niet-gedecodeerde** 1D-barcodes. Het originele 1D-pad
(`barcode.rs` → `barcode-decode`) bemonstert elke kandidaat-scanlijn in een platte reeks modulebits door elke
tegen een **enkele globale module-eenheid**. Bij een schone upload is dat exact, maar op een camerafoto is de modulebreedte dat wel
niet constant over het hele symbool – perspectief, onscherpte en onregelmatige afdrukken strekken het uit – dus één globale eenheid rondt vele af
elementen tegen het verkeerde raster en de rigide EAN/UPC-celdecoder verwerpt het resultaat. Het symbool is _gelokaliseerd_ (`scan`
retourneert kandidaat-scanlijnen) maar nooit _gedecodeerd_.

De oplossing is een nieuwe `crates/code-scan/src/barcode_row.rs`, een trouwe port van de `UPCEANReader`-familie van ZXing. Het nooit
kwantiseert naar een globaal raster: het loopt de scanlijn patroon voor patroon af en normaliseert voor **elk cijfer afzonderlijk**
de vier runbreedtes van dat cijfer naar de cel met zeven modules voordat het wordt vergeleken met de L/G/R-breedtetabellen
(`patternMatchVariance` met `MAX_AVG_VARIANCE` /
`MAX_INDIVIDUAL_VARIANCE`). Omdat elk cijfer zijn eigen lokale eenheid met zich meedraagt, is er geen sprake meer van een geleidelijke verschuiving over het symbool
verslaat het lezen. Het bestrijkt **EAN-13 / UPC-A** (via EAN-13, waarbij het eerste cijfer is teruggevonden uit de zes linkerhelft
pariteitsbits), **EAN-8** en **UPC-E** (die voorheen _no_ decodeerpad hadden - dit ontbreekt in `barcode-decode`'s
symbologielijst), waarbij de gedeelde streepjescodebanddetector opnieuw wordt gebruikt om de scanrijen te kiezen. Het draait in `decode_barcode_frame` als een
fallback **na** de griddecoder faalt, dus schone uploads behouden het snelle pad.

Twee bewakers houden de negatievenmappen op **nul** valse positieven – de lezer is veel toleranter dan het raster
kwantiseerder, dus beide waren essentieel:

- **Stille zones aan beide zijden.** ZXing vereist een achterliggende stille zone die minstens zo breed is als de eindbescherming (die de
  bestaande start-guard rustige zone). Zonder dit programma wordt een `1:1:1` uitgevoerd _inside_ een niet-gerelateerd symbool omlijst een valse "streepjescode"
  dat, gecombineerd met een toevallig geldige controlesom, de bron van de eerste 9 + 12 valse positieven op
  `falsepositives*`.
- **Consensus over meerdere rijen voor de korte symbologieën.** De 8-cijferige EAN-8 / UPC-E zijn gevoelig voor een toevalstreffer en zijn geldig
  rommelige kadrering, zodat ze alleen worden geaccepteerd als **≥ 2 scanrijen** onafhankelijk dezelfde waarde decoderen (een echte
  streepjescode decodeert op veel rijen van de staafhoogte; er verschijnt een toevalstreffer). De 13-cijferige EAN-13 / UPC-A (12 datacijfers
  plus het van pariteit afgeleide eerste cijfer)
  zijn veel minder gevoelig en worden vanuit één rij geaccepteerd. Elke geretourneerde waarde wordt bovendien gevalideerd door de symbolen
  eigen mod-10 controlesom.

**Resultaat:** in de UPC/EAN-mappen steeg rotatie 0 scherp — b.v.
`ean13-3` **3 → 54**, `upca-2` **0 → 31**, `upce-2` **0 → 37**, `upca-5`
**13 → 26**, plus `ean13-1`, `ean8-1`, `upca-1`, `upce-1/3` en omdat de fallback ook op de
frames rechtzetten en opnieuw proberen, vergelijkbare winst bij 90°/180°/270° (bijv. `upce-2` rot90 **0 → 35**). **Geen** andere map
regressief en de negatieve mappen (`falsepositives`, `falsepositives-2`, `unsupported`) blijven op **nul** false
positieve punten. Twee corpus-ondersteunde regressietests in
`code-scan/tests/pipeline.rs` vergrendelt echte UPC-E/EAN-13/EAN-8 fotolezingen en de schone fout-positieve bewaker, en de JS
smoke suite verkrijgt UPC-E + EAN-13 camerafoto's via zowel het upload- als het streamingpad.

**Opmerking: `img.png`.** De real-world opname van de werkruimte-root (`real_world.rs`) is nu netjes gelokaliseerd, maar codeert
het klassieke generatorvoorbeeld `01234567`
waarvan het laatste cijfer **geen** een geldige mod-10-controle is (`0123456` → `01234565`). Een lezer die aan de specificaties voldoet – deze, en
ZXing zelf - wijst een streepjescode af die zijn eigen controlesom niet haalt, dus de pijplijn retourneert daar geen waarde _by design_; dat
test blijft `#[ignore]` als documentatie van de opzettelijke afwijzing (het laten vallen van de controlesombewaker om deze te lezen zou
heropen de valse positieven die de bewaker verwijdert).

**Volgende 1D-iteratie:** UPC/EAN **add-on**-extensies (`upcean-extension-*`, de 2-/5-cijferige supplementen) en de moeilijkste
mappen (`upca-6`, `ean13-5`) blijven op basislijn 0 — de add-on-lezer en een sterkere locator voor die opnames zijn de
bijpassende vervolgacties.
