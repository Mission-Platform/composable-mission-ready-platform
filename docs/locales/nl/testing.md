# Testen in Mission Platform

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> Engelse bron: [docs/testing.md](../../testing.md)
> Taal: Nederlands (nl)

Dit document beschrijft de teststrategie en tooling voor de Mission Platform monorepo. Het dient als zowel een **How-to
handleiding** voor algemene testtaken en een **Technische referentie** voor de onderliggende configuratie.

## Stapel testen

Mission Platform maakt gebruik van een moderne, uniforme teststack op basis van Vitest:

- **Vitest**: De primaire testrunner voor testen op basis van eenheden, componenten en browsers.
- **@vue/test-utils**: standaardbibliotheek voor testen Vue componenten.
- **Vitest Browsermodus (toneelschrijver)**: uitvoering in echte browser voor interactie en visuele tests, indien geconfigureerd.
- **Storybook Test Runner**: integratie tussen Storybook-verhalen en Vitest voor geautomatiseerde interactietests.

## Procedure: tests uitvoeren

Tests worden uitgevoerd via Turborepo om caching en werkruimtebewuste uitvoering te benutten.

### Voer alle tests uit

Om alle unit- en componenttests in de gehele monorepo uit te voeren:

```bash
pnpm test
```

### Voer tests uit voor een specifieke werkruimte

Tests uitvoeren voor één pakket of applicatie:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### Betrokken tests uitvoeren (CI-stijl)
Voor snellere lokale feedback die aansluit bij het CI `--affected` gedrag:

```bash
pnpm exec turbo run test --affected
```

`--affected` selecteert testtaken voor werkruimten die zijn gewijzigd ten opzichte van de basisrevisie van de repository. Laat het achterwege om elke uit te voeren
testtaak voor de werkruimte. De dekking is pakketspecifiek; Het componentenpakket biedt bijvoorbeeld:

```bash
pnpm --filter @mission-platform/components test:coverage
```

### Kijkmodus
Gebruik voor ontwikkeling de watch-modus om tests op bestandswijzigingen opnieuw uit te voeren:

```bash
pnpm --filter @mission-platform/components test:watch
```

### Dekkingsrapporten

Om een ​​dekkingsrapport te genereren met behulp van de `v8` aanbieder:

```bash
pnpm --filter @mission-platform/components test:coverage
```

Rapporten worden uitgevoerd naar de `coverage/` map binnen elke werkruimte.

## How-to: Tests schrijven

### Eenheids- en componenttests

Tests worden op dezelfde locatie geplaatst als de broncode en gebruiken de `.spec.ts` (of `.spec.tsx`) verlenging.

```typescript
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ForgeButton from './ForgeButton.vue';

describe('ForgeButton.vue', () => {
  it('renders props.label when passed', () => {
    const label = 'Click Me';
    const wrapper = mount(ForgeButton, {
      props: { label }
    });
    expect(wrapper.text()).toMatch(label);
  });

  it('emits click event when clicked', async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger('click');
    expect(wrapper.emitted()).toHaveProperty('click');
  });
});
```

### Browser testen

Mission Platform maakt gebruik van Vitest's Browsermodus voor tests waarvoor een echte DOM-omgeving of cross-browser vereist is
verificatie.

1. Schrijf uw testbestand zoals gewoonlijk.
2. Verzeker het pakket `vitest.config.ts` schakelt de browsermodus in (zie onderstaande referentie).
3. Ren met `pnpm test`.

## Technische referentie

### Gedeelde configuratie

De meeste werkruimten gebruiken de `defineVitestConfig` nut van `@mission-platform/vite-config`. Dit levert een gestandaardiseerde
omgeving:

- **Omgeving**: `jsdom` standaard.
- **Globals**: ingeschakeld (importeren is niet nodig `describe`, `it`, `expect` tenzij gewenst).
- **Plug-ins**: Inclusief `@vitejs/plugin-vue` en i18n blok negeren.
- **Dekking**: vooraf geconfigureerd `v8` aanbieder.

**Voorbeeld `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  }
});
```

### Directorystructuur

- `src/**/*.spec.ts`: Eenheidstests en componenttests.
- `src/**/*.stories.tsx`: verhalenboekverhalen (ook gebruikt als definities van interactietests).
- `apps/storybook/vitest.config.ts`: Hoofdconfiguratie voor browsergebaseerde interactietests.

### Samenvatting van scripts

| Script | Commando | Doel |
|:----------------|:--------------------------|:--------------------------------------------|
| `test`          | `pnpm exec turbo run test`                              | Voer alle werkruimtetesttaken uit.            |
| `test:watch`    | `pnpm --filter @mission-platform/components test:watch` | Voer componententests uit in de horlogemodus.      |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` | Genereer een componentendekkingsrapport. |
| Roest/WASM | `cargo test --workspace` | Voer native Rust-krattests uit. |

Wasm-wrapperpakketten worden getest via hun eigen pakkettaken. Voer bijvoorbeeld het scannerpakket en de bijbehorende
samenvouwen bij het wijzigen van het scannergedrag:

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## Gerelateerde documentatie

- [Ontwikkeling instellen](development-setup.md)
- [Beste praktijken](best-practices.md)
- [Pakketontwikkeling](package-development.md)
