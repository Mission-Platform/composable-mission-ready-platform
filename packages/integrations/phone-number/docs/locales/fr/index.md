# @mission-platform/phone-number

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/integrations/phone-number/docs/index.md: [packages/integrations/phone-number/docs/index.md](../../index.md)
> Langue: Français (fr)

`@mission-platform/phone-number` est une réimplémentation ciblée du cœur de
Google [numéro de téléphone lib](https://github.com/google/libphonenumber), écrit en
[AssemblageScript](https://www.assemblyscript.org/) et compilé dans **WebAssembly**. Il analyse, valide, classe et
formate les numéros de téléphone internationaux et est présenté sous la forme d'un module ES autonome sans dépendances d'exécution.

## Architecture

Le package utilise un pipeline de build AssemblyScript → WebAssembly, entièrement piloté par **Vite** :

1. **La source AssemblyScript** (`assembly/`) contient des métadonnées organisées par région (`metadata.ts`) et les
   logique d'analyse/validation/classification/formatage (`index.ts`).
2. **Compilation WASM via Vite** : `@mission-platform/vite-plugin-assemblyscript`
   exécute le compilateur AssemblyScript dans le hook Vite `buildStart`, produisant
   `build/phone-number.wasm` plus liaisons ESM.
3. **Artefact à fichier unique** : le plugin intègre le binaire wasm en base64 dans un
   Module `@generated` (`src/generated/phone-number.js`) exposant une usine `loadModule()` asynchrone et mémorisée -
   éliminant le chargement de fichiers `.wasm` et la résolution d'URL séparés.
4. **Façade typée** : `src/index.ts` expose la classe `PhoneNumberUtil` sur les exportations de wasm brut.

### Reconstruire l'artefact WASM

AssemblyScript est compilé par Vite ; aucun Docker ou chaîne d'outils native n'est requis.

```bash
# Full build:
pnpm --filter @mission-platform/phone-number build

# Or just run Vite (recompiles AssemblyScript, regenerates src/generated):
pnpm --filter @mission-platform/phone-number exec vite build
```

## Usage

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

L'argument `defaultRegion` (ISO 3166-1 alpha-2) est consulté uniquement lorsque l'entrée n'est **pas** déjà en international
formulaire (`+…`, `00…` ou NANP `011…`
Préfixe IDD).

## Possibilité vs validité

- **`isPossibleNumber`** vérifie uniquement que le nombre national significatif a une longueur plausible pour la région.
- **`isValidNumber`** nécessite en outre que le numéro appartienne à une plage fixe ou mobile attribuée (équivalent
  à `getNumberType(...) !== UNKNOWN`).

```ts
util.isPossibleNumber('05001234567', 'GB'); // true  (right length)
util.isValidNumber('05001234567', 'GB'); //    false (unassigned range)
```

## Régions et étendue prises en charge

En amont, libphonenumber fournit des métadonnées exhaustives générées automatiquement pour chaque région de l'UIT. Ce port code un fichier organisé,
sous-ensemble vérifié manuellement — **US, CA, GB, FR, DE, AU, IN, JP, BR, CN, RU** — et implémente la validation sans régularité
expressions (non disponibles dans AssemblyScript), utilisant des règles de longueur et de chiffres principaux. Utilisations de formatage par région
le regroupement de chiffres et constitue une approximation plausible plutôt qu'une parité octet par octet avec l'amont. De nouvelles régions peuvent être ajoutées
en étendant `assembly/metadata.ts` et en reconstruisant le wasm.
