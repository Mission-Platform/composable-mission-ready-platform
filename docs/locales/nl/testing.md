# Testen in Mission Platform

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/testing.md: [docs/testing.md](../../testing.md)
> Taal: Nederlands (nl)

Dit document beschrijft de teststrategie en tooling voor de Mission Platform monorepo. Het dient als zowel een **How-to
gids** voor algemene testtaken en een **Technische referentie** voor de onderliggende configuratie.

## Stapel testen

Mission Platform maakt gebruik van een moderne, uniforme teststack gebaseerd op Vitest:

- **Vitest**: de primaire testloper voor testen op basis van eenheden, componenten en browsers.
- **@vue/test-utils**: standaardbibliotheek voor het testen van Vue-componenten.
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

Voor snellere lokale feedback die overeenkomt met het CI `--affected`-gedrag:

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

Een dekkingsrapport genereren met de `v8`-provider:

```bash
pnpm --filter @mission-platform/components test:coverage
```

Rapporten worden in elke werkruimte uitgevoerd naar de map `coverage/`.

## How-to: Tests schrijven

### Eenheids- en componenttests

Tests worden op dezelfde locatie geplaatst als de broncode en gebruiken de extensie `.spec.ts` (of `.spec.tsx`).

```typescript
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import ForgeButton from "./ForgeButton.vue";

describe("ForgeButton.vue", () => {
  it("renders props.label when passed", () => {
    const label = "Click Me";
    const wrapper = mount(ForgeButton, {
      props: { label },
    });
    expect(wrapper.text()).toMatch(label);
  });

  it("emits click event when clicked", async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger("click");
    expect(wrapper.emitted()).toHaveProperty("click");
  });
});
```

### Browser testen

Mission Platform maakt gebruik van de browsermodus van Vitest voor tests waarvoor een echte DOM-omgeving of cross-browser vereist is
verificatie.

1. Schrijf uw testbestand zoals gewoonlijk.
2. Zorg ervoor dat het pakket `vitest.config.ts` de browsermodus inschakelt (zie onderstaande referentie).
3. Voer uit met `pnpm test`.

### Smeed webscripttests

Gebruik `@mission-platform/forge-web-script-vitest` voor deterministische compiler, artefact, Wasm en zelf-hostende pariteit
cheques. Het delegeert de compilatie aan dezelfde compilerservice en Vite-plug-in die door de productie wordt gebruikt; het creëert geen
tweede modulesysteem.

Installeer het pakket in een werkruimte die `.fws`-modules test en stel vervolgens de adapter samen met de standaard Vitest-configuratie:

```typescript
// vitest.config.ts
import { defineForgeWebScriptVitestConfig } from "@mission-platform/forge-web-script-vitest";

export default defineForgeWebScriptVitestConfig({
  environment: "node",
  forgeWebScript: {
    root: import.meta.dirname,
    requestedCapabilities: ["clock.now"],
    selfHostedVmMode: "interpret",
  },
  overrides: {
    // Consumer plugins, aliases, and other Vite/Vitest settings remain active.
    resolve: { alias: { "@fixtures": "./fixtures" } },
  },
});
```

Voor directe compiler- en runtime-beweringen maakt u één harnas per suite of test en plaatst u deze in `afterEach`:

```typescript
import { afterEach, describe, expect, it } from "vitest";
import {
  assertForgeWebScriptDiagnostic,
  assertForgeWebScriptNoDiagnostics,
  createForgeWebScriptTestHarness,
} from "@mission-platform/forge-web-script-vitest";

describe("FWS fixture", () => {
  const harness = createForgeWebScriptTestHarness({
    requestedCapabilities: ["clock.now"],
  });

  afterEach(() => harness.dispose());

  it("checks artifacts, Wasm exports, and explicit capabilities", async () => {
    const result = await harness.compile("valid/scalar.fws");
    assertForgeWebScriptNoDiagnostics(result.diagnostics);
    expect(result.artifact.manifest?.exports.map(({ name }) => name)).toEqual([
      "answer",
    ]);
    expect(
      (
        await harness.load<{ answer: () => number }>("valid/scalar.fws")
      ).answer(),
    ).toBe(42);

    const clock = await harness.load<{ current: () => bigint }>(
      "capabilities/clock-now.fws",
      {
        "clock.now": { now: () => 123n },
      },
    );
    expect(clock.current()).toBe(123n);
  });

  it("keeps diagnostic code, phase, and span structured", async () => {
    const result = await harness.inspect("diagnostics/invalid-type.fws");
    assertForgeWebScriptDiagnostic(result.diagnostics, {
      code: "FWS-TYPE-005",
      phase: "type-check",
      line: 2,
    });
  });
});
```

`load` en `loadSync` accepteren alleen de importmogelijkheden die door de test worden geleverd. Ontbrekende aangegeven invoer en geleverd
zwartwerkimport mislukt expliciet; er worden impliciet geen browser- of Node-API's geïnjecteerd. Gebruik `compileGraph` voor bronimport
grafieken en vergelijk `graphHash`, gekoppelde modules, declaraties en inhoudshashes bij het testen van de linkconfiguratie.

Het adapterpad test het gegenereerde ESM-contract zoals Vitest het ziet:

```typescript
import {
  abiManifest,
  load,
  loadSync,
  manifest,
} from "./fixtures/valid/scalar.fws";

expect(abiManifest).toEqual(manifest);
expect((await load<{ answer: () => number }>()).answer()).toBe(42);
expect(loadSync<{ answer: () => number }>().answer()).toBe(42);
```

Voor FWS-waarden test u beide lagen expliciet. Ruwe WASM-tests zouden het moeten bevestigen
pointer-length ABI en eigendomsoproepen; gegenereerde ESM-tests moeten het bewijs leveren
JavaScript-projectie:

```typescript
const artifact = harness.compileSource(
  `
  export fn echo(value: string) -> string { return value; }
`,
  "strings.fws",
).artifact;

const generated = await importFromEsmSource(artifact.esmSource);
expect(generated.loadSync().echo("Δοκιμή 🚀")).toBe("Δοκιμή 🚀");
expect((await generated.load()).echo("")).toBe("");
```

Grenstests van gegenereerde laders moeten ASCII, lege, multi-byte UTF-8,
geretourneerde aaneenschakelingen, import van tekenreeksmogelijkheden, onbewerkte `bytes`-tupels en
de blootgestelde `memory`. Gebruik fatale UTF-8-armaturen en beweer dat tijdelijk
`fws_dealloc`-aanroepen vinden plaats bij succesvolle retourzendingen, gasttraps, hostuitzonderingen,
en decodeerfouten. Instrumenteer de gegenereerde `artifact.esmSource` eerder
importeren; Bij het patchen van de export na het laden wordt dat niet in acht genomen
sluit de oorspronkelijke allocator en de deallocator af.

De gegenereerde adapter verpakt alle stringargumenten voor één aanroep in één
toewijzing van gasten. Houd een bewering voor het aantal toewijzingen bij voor functies met
meerdere tekenreeksparameters en bewaar een test die alleen scalair is om dat nee te verifiëren
Er wordt tekenreeksmarshallingwerk gegenereerd voor functies die alleen numeriek zijn. Een bytestest
moet doorgaan met het doorgeven van een `[pointer, length]`-tupel in plaats van een te verwachten
automatische `Uint8Array`-conversie.

De benchmarkwerkruimte vergelijkt de onbewerkte pointerlengte-adapter met de
gegenereerde ESM-adapter als afzonderlijke FWS-modi:

```bash
pnpm --filter @mission-platform/benchmark run bench -- \
  --node-only --warmup 3 --samples 10 \
  --output benchmark/results/fws-generated-boundary
```

Rapporten omvatten de build-, initialisatie- en steady-state uitvoeringsfasen. De
FWS onbewerkte `wasm`-rij maakt gebruik van nieuwe exemplaren en invoertoewijzingen van drie tekenreeksen voor
de benchmarkkernel; `wasm-generated` gebruikt het gegenereerde `loadSync`-contract
en één verpakte stringinvoertoewijzing. Omdat de huidige gastdeallocator
valideert bereiken zonder de bump-allocatorruimte en gegenereerde tekenreeksen/bytes te recyclen
monsters gebruiken per aanroep een nieuwe loader-instantie; scalaire monsters hergebruiken de geladen
voorbeeld. Dit isoleert elk allocatie-zwaar monster en is opzettelijk
gerapporteerd als overhead van de ladergrens in plaats van een claim van een persistent exemplaar.
Elk artefact rapporteert onbewerkte Wasm-bytes, gegenereerde ESM-bronbytes, inhoudhash,
en de statische toewijzingstellingen die bij de vergelijking worden gebruikt. Alleen rijen vergelijken
wanneer de corpushash, hostruntime en benchmarkschema overeenkomen.

De Node-run hierboven leverde bijvoorbeeld 336 gemeten faseresultaten op
nul fouten en corpus-hash `ad092f7c552cc914`. Beide FWS-rijen hadden rauwe Wasm
hash `0ac58f11`, onbewerkte Wasm-grootte 1.625 bytes en gegenereerde ESM-brongrootte 18.490
bytes; Het aantal ruwe en gegenereerde stringinvoertoewijzingen was 3 en 1. Op de
Unicode-kleine tekenreeks, gemiddelde initialisatie was 0,00024 ms onbewerkt versus
0,00188 ms gegenereerd en de gemiddelde uitvoering was 0,0236 ms onbewerkt versus 0,1070 ms
gegenereerd tijdens de geregistreerde Node-run. Deze cijfers zijn representatief bewijs,
geen prestatiegaranties voor meerdere machines; gebruik de voorbeelden per geval van het rapport
voor vergelijkingen.

De plug-in maakt ook expliciete virtuele zoekopdrachten mogelijk voor `?forge-web-script-manifest`, `?forge-web-script-declarations`,
`?forge-web-script-wasm` en `?forge-web-script-source-map`. Om deze omgevingsmodules vindbaar te maken voor TypeScript,
voeg het subpad voor de verzonden aangifte toe aan de typen van het testproject:

```json
{
  "compilerOptions": {
    "types": [
      "node",
      "@mission-platform/forge-web-script-vitest/forge-web-script"
    ]
  }
}
```

U kunt ook `/// <reference types="@mission-platform/forge-web-script-vitest/forge-web-script" />` toevoegen aan een testbestand
type entrypoint opgenomen in het project. Het declaratie-subpad is alleen van het type en voegt geen runtime-import toe.

Gebruik gedeelde armaturen in `packages/forge-web-script-vitest/fixtures/` voor taaloverschrijdende taal en ABI-conformiteit:
`valid/`, `diagnostics/`, `capabilities/`, `graphs/` en `self-hosted/` zijn opzettelijk stabiel. Houd een armatuur ernaast
een compiler-, runtime- of plug-inspecificatie wanneer deze een privé-implementatiedetail omvat; gebruik inline bron voor kleine parser of
VM-eenheidsgevallen. Hierdoor blijven de namen van de apparaten en het opruimen deterministisch zonder dat er tests op laag niveau door het harnas worden geforceerd.

`checkVmParity(file, mode)` ondersteunt `interpret`, `jit` en `aot`, maar het rapport is het bestaande begrensde, zelf-hostende
pariteitscontract in de lex-fase. Beweer `parity`, vingerafdrukken, stappen en metagegevens over de reproduceerbaarheid van AOT; behandel het rapport niet
als willekeurig gecompileerde FWS VM-uitvoering of als vervanging voor Wasm-gedragstests.

Voer de gerichte FWS-matrix uit met de normale werkruimtetaken:

```bash
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-vitest
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-runtime
pnpm exec turbo run test build:check --filter @mission-platform/vite-plugin-forge-web-script
```

## Technische referentie

### Gedeelde configuratie

De meeste werkruimten gebruiken het hulpprogramma `defineVitestConfig` van `@mission-platform/vite-config`. Dit levert een gestandaardiseerde
omgeving:

- **Omgeving**: standaard `jsdom`.
- **Globals**: ingeschakeld (u hoeft `describe`, `it`, `expect` niet te importeren tenzij gewenst).
- **Plug-ins**: Inclusief het negeren van `@vitejs/plugin-vue` en i18n-blokken.
- **Dekking**: vooraf geconfigureerde `v8`-provider.

**Voorbeeld `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from "@mission-platform/vite-config/vitest";

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  },
});
```

### Directorystructuur

- `src/**/*.spec.ts`: eenheidstests en componenttests.
- `src/**/*.stories.tsx`: verhalenboekverhalen (ook gebruikt als definities van interactietests).
- `apps/storybook/vitest.config.ts`: Hoofdconfiguratie voor browsergebaseerde interactietests.

### Samenvatting van scripts

| Script | Commando | Doel |
| :-------------- | :--------------------------------------------------------- | :------------------------------------- |
| `test` | `pnpm exec turbo run test` | Voer alle werkruimtetesttaken uit.          |
| `test:watch` | `pnpm --filter @mission-platform/components test:watch` | Voer componententests uit in de horlogemodus.    |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` | Genereer een componentendekkingsrapport. |
| Roest/WASM | `cargo test --workspace` | Voer native Rust-krattests uit.           |

Wasm-wrapperpakketten worden getest via hun eigen pakkettaken. Voer bijvoorbeeld het scannerpakket en de bijbehorende
samenvouwen bij het wijzigen van het scannergedrag:

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## Gerelateerde documentatie

- [Ontwikkeling instellen](development-setup.md)
- [Beste praktijken](best-practices.md)
- [Pakketontwikkeling](package-development.md)
