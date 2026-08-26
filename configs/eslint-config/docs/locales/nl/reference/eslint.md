# ESLint Configuratie

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> configs/eslint-config/docs/reference/eslint.md: [configs/eslint-config/docs/reference/eslint.md](../../../reference/eslint.md)
> Taal: Nederlands (nl)

De `@mission-platform/eslint-config` pakket biedt een gecentraliseerde, platte ESLint configuratie voor de gehele monorepo.

## Overzicht

Mission Platform maakt gebruik van de ESLint Flat Config-formaat (`eslint.config.js`). De gedeelde configuratie dwingt consistentie af
codekwaliteit, toegankelijkheid en architectuurregels voor alle pakketten, applicaties en werkers.

## Belangrijkste kenmerken

- **TypeScript Ondersteuning**: Typebewuste linting mogelijk gemaakt door `typescript-eslint`.
- **Vue 3 SFC's**: Dwingt af `<script setup>` en beste praktijken via `eslint-plugin-vue`.
- **Toegankelijkheid**: ingebouwde toegankelijkheidscontroles voor Vue sjablonen met `eslint-plugin-vuejs-accessibility`.
- **Importorganisatie**: Automatisch sorteren en valideren van importen via `eslint-plugin-import-x`.
- **Monorepo-bewustzijn**: integratie met `eslint-config-turbo` om ervoor te zorgen dat omgevingsvariabelen correct worden gedeclareerd.

## Ingebouwde plug-ins

De configuratie omvat de volgende plug-ins en regelsets:

| Plug-in                  | Doel                                                        |
| :----------------------- | :---------------------------------------------------------- |
| `typescript-eslint`      | Standaard TypeScript regels en typebewuste linting.         |
| `eslint-plugin-vue`      | Vue 3 SFC-linting en sjabloonvalidatie.                     |
| `eslint-plugin-sonarjs`  | Detectie van codegeuren en bugrisico's.                     |
| `eslint-plugin-unicorn`  | Tientallen kleine, nuttige gemeenschapsregels.              |
| `eslint-plugin-i18next`  | Zorgt ervoor dat vertaalsleutels correct worden gebruikt.   |
| `eslint-config-prettier` | Schakelt regels uit die in strijd zijn met Prettier opmaak. |

## Gebruik

Als u de gedeelde configuratie op een werkruimte wilt toepassen, maakt u een `eslint.config.js` bestand in de hoofdmap van de werkruimte:

```js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // Add workspace-specific overrides here
];
```

## Het runnen van de Linter

Gebruik Turborepo om linting over een of meer werkruimten uit te voeren:

```bash
# Lint the entire monorepo
pnpm exec turbo run lint

# Lint a specific package
pnpm exec turbo run lint --filter <package-name>

# Automatically fix fixable issues
pnpm exec turbo run lint:fix
```
