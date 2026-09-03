# @mission-platform/phone-number

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/integrations/phone-number/docs/index.md: [packages/integrations/phone-number/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

`@mission-platform/phone-number` is een gerichte herimplementatie van de kern van
Googlen [libtelefoonnummer](https://github.com/google/libphonenumber), geschreven in
[AssemblyScript](https://www.assemblyscript.org/) en gecompileerd naar **WebAssembly**. Het ontleedt, valideert, classificeert en
formatteert internationale telefoonnummers en is verpakt als een op zichzelf staande ES-module zonder runtime-afhankelijkheden.

## Architectuur

Het pakket maakt gebruik van een AssemblyScript → WebAssembly-buildpijplijn, volledig aangestuurd door **Vite**:

1. **AssemblyScript-bron** (`assembly/`) bevat beheerde metagegevens per regio (`metadata.ts`) en de
   logica ontleden/valideren/classificeren/formatteren (`index.ts`).
2. **WASM-compilatie via Vite**: `@mission-platform/vite-plugin-assemblyscript`
   voert de AssemblyScript-compiler uit in de Vite `buildStart` hook, waardoor
   `build/phone-number.wasm` plus ESM-bindingen.
3. **Artefact met één bestand**: de plug-in lijnt het wasm-binaire bestand als base64 in een
   `@generated`-module (`src/generated/phone-number.js`) die een asynchrone, opgeslagen `loadModule()`-fabriek blootlegt -
   het elimineren van afzonderlijk `.wasm`-bestandsladen en URL-resolutie.
4. **Getypte façade**: `src/index.ts` geeft de klasse `PhoneNumberUtil` weer via de ruwe wasm-export.

### Het WASM-artefact opnieuw opbouwen

AssemblyScript wordt gecompileerd door Vite; er is geen Docker of native toolchain vereist.

```bash
# Full build:
pnpm --filter @mission-platform/phone-number build

# Or just run Vite (recompiles AssemblyScript, regenerates src/generated):
pnpm --filter @mission-platform/phone-number exec vite build
```

## Gebruik

```ts
import { getPhoneNumberUtil, PhoneNumberFormat, PhoneNumberType } from '@mission-platform/phone-number';

const util = await getPhoneNumberUtil();

// Validation
util.isValidNumber('+14155552671', 'US'); // true
util.isPossibleNumber('12345', 'US'); // false

// Classification
util.getNumberType('07911 123456', 'GB'); // PhoneNumberType.MOBILE
util.getNumberType('+14155552671', 'US'); // PhoneNumberType.FIXED_LINE_OR_MOBILE

// Region lookup
util.getRegionCodeForNumber('+44 20 7946 0958', 'US'); // 'GB'
util.getCountryCodeForRegion('FR'); // 33

// Formatting
util.format('4155552671', 'US', PhoneNumberFormat.NATIONAL); // '(415) 555-2671'
util.format('4155552671', 'US', PhoneNumberFormat.E164); // '+14155552671'
util.format('07911 123456', 'GB', PhoneNumberFormat.INTERNATIONAL); // '+44 7911 123456'
util.format('4155552671', 'US', PhoneNumberFormat.RFC3966); // 'tel:+14155552671'
```

Het argument `defaultRegion` (ISO 3166-1 alpha-2) wordt alleen geraadpleegd als de invoer **niet** al in de internationale
formulier (`+…`, `00…` of de NANP `011…`
IDD-voorvoegsel).

## Mogelijkheid versus geldigheid

- **`isPossibleNumber`** controleert alleen of het nationale significante getal een plausibele lengte heeft voor de regio.
- **`isValidNumber`** vereist bovendien dat het nummer binnen een toegewezen vast of mobiel bereik valt (equivalent
  naar `getNumberType(...) !== UNKNOWN`).

```ts
util.isPossibleNumber('05001234567', 'GB'); // true  (right length)
util.isValidNumber('05001234567', 'GB'); //    false (unassigned range)
```

## Ondersteunde regio's en bereik

Upstream libphonenumber verzendt uitgebreide, machinaal gegenereerde metadata voor elke ITU-regio. Deze poort codeert voor een samengestelde,
met de hand geverifieerde subset — **VS, CA, GB, FR, DE, AU, IN, JP, BR, CN, RU** — en implementeert validatie zonder reguliere
expressies (niet beschikbaar in AssemblyScript), waarbij regels voor lengte en voorloopcijfers worden gebruikt. Opmaak gebruikt per regio
cijfergroepering en is een plausibele benadering in plaats van byte-voor-byte-pariteit met stroomopwaarts. Er kunnen nieuwe regio's worden toegevoegd
door `assembly/metadata.ts` uit te breiden en de wasm opnieuw op te bouwen.
