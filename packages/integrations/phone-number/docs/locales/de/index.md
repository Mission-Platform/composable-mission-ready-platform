# @mission-platform/phone-number

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/integrations/phone-number/docs/index.md: [packages/integrations/phone-number/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

`@mission-platform/phone-number` ist eine gezielte Neuimplementierung des Kerns von
Google [libphonenumber](https://github.com/google/libphonenumber), geschrieben in
[AssemblyScript](https://www.assemblyscript.org/) und zu **WebAssembly** kompiliert. Es analysiert, validiert, klassifiziert und
formatiert internationale Telefonnummern und ist als eigenständiges ES-Modul ohne Laufzeitabhängigkeiten verpackt.

## Architektur

Das Paket verwendet eine AssemblyScript → WebAssembly-Build-Pipeline, die vollständig von **Vite** gesteuert wird:

1. **AssemblyScript-Quelle** (`assembly/`) enthält kuratierte Metadaten pro Region (`metadata.ts`) und die
   Logik zum Analysieren/Validieren/Klassifizieren/Formatieren (`index.ts`).
2. **WASM-Kompilierung über Vite**: `@mission-platform/vite-plugin-assemblyscript`
   führt den AssemblyScript-Compiler im Vite `buildStart`-Hook aus und erzeugt
   `build/phone-number.wasm` plus ESM-Bindungen.
3. **Einzeldatei-Artefakt**: Das Plugin integriert die Wasm-Binärdatei als Base64 in eine
   `@generated`-Modul (`src/generated/phone-number.js`), das eine asynchrone, gespeicherte `loadModule()`-Fabrik offenlegt –
   Eliminierung des separaten `.wasm`-Dateiladens und der URL-Auflösung.
4. **Typisierte Fassade**: `src/index.ts` macht die `PhoneNumberUtil`-Klasse über die rohen WASM-Exporte verfügbar.

### Wiederherstellung des WASM-Artefakts

AssemblyScript wird von Vite kompiliert; Es ist kein Docker oder eine native Toolchain erforderlich.

```bash
# Full build:
pnpm --filter @mission-platform/phone-number build

# Or just run Vite (recompiles AssemblyScript, regenerates src/generated):
pnpm --filter @mission-platform/phone-number exec vite build
```

## Verwendung

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

Das Argument `defaultRegion` (ISO 3166-1 Alpha-2) wird nur herangezogen, wenn die Eingabe **nicht** bereits in internationaler Sprache vorliegt
Formular (`+…`, `00…` oder das NANP `011…`
IDD-Präfix).

## Möglichkeit vs. Gültigkeit

- **`isPossibleNumber`** prüft nur, ob die nationale signifikante Zahl eine plausible Länge für die Region hat.
- **`isValidNumber`** erfordert zusätzlich, dass die Nummer in einen zugewiesenen Festnetz- oder Mobilfunkbereich (äquivalent) fällt
  zu `getNumberType(...) !== UNKNOWN`).

```ts
util.isPossibleNumber('05001234567', 'GB'); // true  (right length)
util.isValidNumber('05001234567', 'GB'); //    false (unassigned range)
```

## Unterstützte Regionen und Umfang

Die vorgelagerte libphonenumber liefert umfassende, maschinell generierte Metadaten für jede ITU-Region. Dieser Port kodiert eine kuratierte,
handverifizierte Teilmenge – **US, CA, GB, FR, DE, AU, IN, JP, BR, CN, RU** – und implementiert die Validierung ohne reguläre
Ausdrücke (in AssemblyScript nicht verfügbar) unter Verwendung von Längen- und führenden Ziffernregeln. Die Formatierung erfolgt pro Region
Zifferngruppierung und ist eher eine plausible Näherung als eine Byte-für-Byte-Parität mit dem Upstream. Neue Regionen können hinzugefügt werden
durch Erweitern von `assembly/metadata.ts` und Neuerstellung des WASM.
