# @mission-platform/phone-number

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/phone-number/docs/index.md: [packages/phone-number/docs/index.md](../../index.md)
> Lingua: Italiano (it)

`@mission-platform/phone-number` è una reimplementazione mirata del nucleo di
Google [libphonenumber](https://github.com/google/libphonenumber), scritto in
[AssemblyScript](https://www.assemblyscript.org/) e compilato in **WebAssembly**. Analizza, convalida, classifica e
formatta i numeri di telefono internazionali ed è confezionato come modulo ES autonomo senza dipendenze di runtime.

## Architettura

Il pacchetto utilizza una pipeline di compilazione AssemblyScript → WebAssembly, guidata interamente da **Vite**:

1. **L'origine AssemblyScript** (`assembly/`) contiene metadati selezionati per regione (`metadata.ts`) e
   analizzare/convalidare/classificare/formattare la logica (`index.ts`).
2. **Compilazione WASM tramite Vite**: `@mission-platform/vite-plugin-assemblyscript`
   esegue il compilatore AssemblyScript nell'hook Vite `buildStart`, producendo
   `build/phone-number.wasm` più attacchi ESM.
3. **Artefatto a file singolo**: il plugin integra il binario wasm come base64 in un
   Modulo `@generated` (`src/generated/phone-number.js`) che espone una factory `loadModule()` asincrona e memorizzata —
   eliminando il caricamento separato del file `.wasm` e la risoluzione dell'URL.
4. **Facciata tipizzata**: `src/index.ts` espone la classe `PhoneNumberUtil` sulle esportazioni wasm grezze.

### Ricostruire l'artefatto WASM

AssemblyScript è compilato da Vite; non è richiesto alcun Docker o toolchain nativa.

```bash
# Full build:
pnpm --filter @mission-platform/phone-number build

# Or just run Vite (recompiles AssemblyScript, regenerates src/generated):
pnpm --filter @mission-platform/phone-number exec vite build
```

## Utilizzo

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

L'argomento `defaultRegion` (ISO 3166-1 alpha-2) viene consultato solo quando l'input **non** è già in formato internazionale
modulo (`+…`, `00…` o NANP `011…`
prefisso IDD).

## Possibilità vs. validità

- **`isPossibleNumber`** controlla solo che il numero significativo nazionale abbia una lunghezza plausibile per la regione.
- **`isValidNumber`** richiede inoltre che il numero rientri in un intervallo assegnato di linea fissa o mobile (equivalente
  a `getNumberType(...) !== UNKNOWN`).

```ts
util.isPossibleNumber('05001234567', 'GB'); // true  (right length)
util.isValidNumber('05001234567', 'GB'); //    false (unassigned range)
```

## Regioni e ambito supportati

libphonenumber a monte fornisce metadati esaustivi generati dalla macchina per ogni regione ITU. Questa porta codifica un'interfaccia curata,
sottoinsieme verificato manualmente — **US, CA, GB, FR, DE, AU, IN, JP, BR, CN, RU** — e implementa la convalida senza regolari
espressioni (non disponibili in AssemblyScript), utilizzando le regole relative alla lunghezza e alle cifre iniziali. La formattazione utilizza per regione
raggruppamento di cifre ed è un'approssimazione plausibile piuttosto che la parità byte per byte con upstream. È possibile aggiungere nuove regioni
estendendo `assembly/metadata.ts` e ricostruendo il file wasm.
