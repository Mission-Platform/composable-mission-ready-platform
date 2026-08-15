# Configuratiepakketten

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> Engelse bron: [docs/configs/index.md](../../../configs/index.md)
> Taal: Nederlands (nl)

Het Mission Platform maakt gebruik van gecentraliseerde configuratiepakketten in de `configs/` directory om consistentie te garanderen
de monorepo.

## Overzicht

Door configuraties te centraliseren is één enkele bron van waarheid mogelijk voor toolregels, bouwprocessen en codestijl.
Pakketten en applicaties gebruiken deze configuraties door ze uit te breiden in hun lokale configuratiebestanden.

## Pakketoverzicht

| Pakket | Doel | Primair configuratieoppervlak |
|:---|:---|:---|
| [`@mission-platform/eslint-config`](eslint-config.md) | Vlak ESLint regels voor JS/TS en Vue. | `eslint.config.js` |
| `@mission-platform/prettier-config` | Standaardinstellingen voor de opmaak van de opslagplaats. | `prettier.config.mjs` |
| `@mission-platform/typescript-config` | TypeScript compiler-voorinstellingen. | `tsconfig.json` |
| `@mission-platform/stylelint-config` | CSS- en SCSS-linting. | `stylelint.config.mjs` |
| `@mission-platform/vite-config` | Vite En Vitest configuratiehulpen. | `vite.config.ts` |
| `@mission-platform/tsdown-config` | Helpers bij het bundelen van bibliotheken. | `tsdown.config.ts` |
| `@mission-platform/postcss-config` | Gedeelde PostCSS-pijplijn. | `postcss.config.mjs` |
| `@mission-platform/i18n-config` | Gedeelde landinstellingen en extractie-instellingen. | `i18next.config.ts` |
| `@mission-platform/storybook-framework` | Door de omgeving geselecteerde Storybook-framework-voorinstelling. | `.storybook/main.ts` |
| [Configuratie van werknemers](workers-config.md) | Cloudflare Worker-conventies. | `wrangler.jsonc` |

## Kern gereedschap

### ESLint (`@mission-platform/eslint-config`)

Standaardiseert codekwaliteitsregels voor alle werkruimten. Het maakt gebruik van het Flat Config-formaat en biedt ondersteuning voor
TypeScript, Vue 3, en toegankelijkheid.

### Prettier (`@mission-platform/prettier-config`)

Dwingt een consistente codestijl af (tabs, aanhalingstekens, puntkomma's) in de gehele monorepo.

### TypeScript (`@mission-platform/typescript-config`)

Biedt basis `tsconfig` presets voor verschillende doelen:

- `base`: Algemene standaardinstellingen.
- `vue`: Geoptimaliseerd voor Vue 3 SFC's.
- `node`: Geoptimaliseerd voor Node.js-omgevingen.
- `framework-<name>`: Voegt de overeenkomende toe `mp:<framework>` exportvoorwaarde voor externe consumenten.

## Bouw systeem

### Vite (`@mission-platform/vite-config`)

Biedt fabrieksfuncties om te creëren Vite configuraties voor zowel applicaties als bibliotheken.

```ts
import { defineAppConfig, defineLibraryConfig } from '@mission-platform/vite-config';
```

- `defineAppConfig`: Voor toepassingen op het hoogste niveau (SPA, werknemers).
- `defineLibraryConfig`: Voor gedeelde pakketten met optimale bundeling en boomschudden.

### PostCSS (`@mission-platform/postcss-config`)

Deelt de PostCSS-plug-inpijplijn (inclusief Autoprefixer) om ervoor te zorgen dat CSS consistent wordt verwerkt, ongeacht waar
het is geschreven.

## Gebruikspatroon

Een configuratie in een werkruimte gebruiken:

1. Voeg het configuratiepakket toe als een `devDependency` in `package.json`.
2. Maak een lokaal configuratiebestand (bijv. `eslint.config.js`).
3. Importeer en exporteer/breid de basisconfiguratie uit.

```js
// Example: eslint.config.js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // local overrides
];
```

## Een configuratie kiezen

Gebruik het pakket dat eigenaar is van het probleem in plaats van regels naar een werkruimte te kopiëren. Applicatie- en bibliotheekbuildbestanden
kan lokale overschrijvingen toevoegen, maar gedeelde standaardwaarden moeten behouden blijven `configs/`. Voor een nieuw pakket begint u met het pakket
steiger en voer vervolgens de werkruimtecontroles uit:

```bash
pnpm exec turbo run build:check --filter @mission-platform/<name>
pnpm exec turbo run lint --filter @mission-platform/<name>
pnpm exec turbo run format --filter @mission-platform/<name>
```
