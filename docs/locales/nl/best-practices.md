# Best practices van het missieplatform

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/best-practices.md: [docs/best-practices.md](../../best-practices.md)
> Taal: Nederlands (nl)

Dit document schetst de kernprincipes, architectuur en coderingsnormen voor de monorepo van Mission Platform. Het
dient als **Verklaring** waarom we bepaalde patronen volgen en als **Richtlijn** voor de dagelijkse ontwikkeling.

## Kernprincipes

### Composeerbare architectuur

Mission Platform volgt een pakketgestuurde, samenstelbare architectuur. Herbruikbare bouwstenen (UI-componenten,
composables, hulpprogramma's) bevinden zich in `packages/`, terwijl inzetbare applicaties uit deze blokken worden samengesteld in `apps/`.

### Afhankelijkheidsdiscipline

Om een onderhoudbare monorepo in stand te houden, handhaven we een strikte eenrichtingsafhankelijkheidsstroom:

- **`apps`** → **`packages`**
- **`packages`** → domeinpakketten op een lager niveau, zoals **`core`**, **`tooling`** en **`compiler`**

**Regel:** Code in `packages/` moet **nooit** geïmporteerd worden uit `apps/`. Dit voorkomt circulaire afhankelijkheden en waarborgt
verpakkingen blijven echt herbruikbaar.

### Verhalenboek als werkbank

Wanneer u componenten in `packages/` toevoegt of wijzigt, gebruik dan de Storybook-app (`apps/storybook`) als uw primaire ontwikkeling
omgeving. De `apps/storybook`-app bevat niet de verhalen zelf; het is de verzamelwerkbank die
ontdekt en geeft de verhalen weer die naast hun componenten leven.

- Plaats elk `.stories.tsx`-bestand samen met zijn component in de pakketmap van die component (bijv.
  `packages/ui/components/src/components/**/<component>/<component>.stories.tsx`), niet onder `apps/storybook`. Dit komt overeen
  de conventie in [Atomic Component Design](atomic-component-design.md).
- Controleer het gedrag van componenten in Vue, React, Svelte, Solid en webcomponenten door de
  `STORYBOOK_FRAMEWORK` omgevingsvariabele. Elke modus moet dezelfde neutrale verhaalinventaris gebruiken; een vermist
  Framework-artefact is een pakket-/exportfout, en geen reden om dat verhaal eruit te filteren.

De volledige statische validatielus is:

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

## Ontwikkelingsnormen

### TypeScript Overal

Alle nieuwe broncode moet worden geschreven in TypeScript (`.ts`) of Vue SFC's met `<script setup lang="ts">`.

- **Strikte modus**: `strict: true` wordt afgedwongen voor alle `tsconfig.json`-bestanden.
- **Expliciete typen**: Geef expliciete typen op voor alle openbare API's, geëxporteerde functies en composables.
- **Vermijd `any`**: gebruik nauwkeurige typen of generieke geneesmiddelen. Als een type echt onbekend is, gebruik dan `unknown` en voer typevernauwing uit.

### Framework-neutrale componenten

Schrijf waar mogelijk UI-componenten met behulp van het `@mission-platform/forge-jsx`-dialect. Hierdoor kunnen componenten worden
gecompileerd en gebruikt in Vue, React, Svelte, Solid en Web Components zonder de kernlogica te herschrijven. Configureer de
consumentenresolver met de overeenkomende voorwaarde `mp:vue`, `mp:react`, `mp:svelte`, `mp:solid` of `mp:web-component`.

### Reactiviteitspatronen (Vue 3)

- Gebruik uitsluitend de **Composition API**.
- Geef de voorkeur aan `ref()` voor de meeste staten om de consistentie te behouden.
- Extraheer complexe stateful logica in **Composables** (`useXxx`).
- Zorg ervoor dat alle bijwerkingen (watchers, intervallen, gebeurtenislisteners) goed zijn opgeschoond in `onUnmounted`.

## Monorepo-workflow

### Isolatie van zorgen

- **Nieuwe UI-componenten**: horen thuis in `packages/`.
- **Gedeelde hulpprogramma's**: horen thuis in `packages/`.
- **Lint/Format/Build Tooling**: gedeelde configuraties horen thuis in `packages/tooling/configs/`.

### Linten en opmaak

Een consistente codestijl wordt afgedwongen via ESLint en Prettier.

- Voer `pnpm lint` uit om te controleren op overtredingen.
- Voer `pnpm format:write` uit om opmaakproblemen automatisch op te lossen.
- Commit-berichten moeten de **Conventionele Commits**-specificatie volgen.

### Upstream afhankelijkheidspriming en pakkettesten

In een modulaire monorepo importeren downstream-pakketten regelmatig build-uitvoer (`dist/`) uit upstream-pakketten. Om fouten in de clean-state-test te elimineren en te voorkomen dat de build-volgorde van meerdere pakketten handmatig wordt gevolgd:

1. **Geautomatiseerde upstream-opbouwpriming (`^build`)**:
   `turbo.json`-taakgrafieken definiëren `test`, `build:check` en verificatietaken met `"dependsOn": ["^build"]`. Het uitvoeren van een test- of typecheck-taak via Turborepo bouwt automatisch eerst alle upstream-werkruimte-afhankelijkheden op.

2. **Pakketgerichte uitvoering**:
   Een individueel pakket testen of bouwen zonder de vereisten handmatig te compileren:
   - Voer tests uit met priming:
     ```bash
     pnpm test:package <package-name>
     ```
     of rechtstreeks via Turborepo:
     ```bash
     pnpm exec turbo run test --filter <package-name>
     ```
   - Bouw een pakket met zijn afhankelijkheden:
     ```bash
     pnpm build:package <package-name>
     ```
     of rechtstreeks via Turborepo:
     ```bash
     pnpm exec turbo run build --filter <package-name>
     ```

   In Turbo-filters selecteert `<package-name>...` het pakket EN de upstream ervan
   afhankelijkheden selecteert `...<package-name>` het pakket EN de downstream ervan
   depends, en `<package-name>^...` selecteert alleen de upstream van het pakket
   afhankelijkheden (exclusief het pakket zelf). De pakkethelpers worden expliciet uitgevoerd
   het upstream-formulier (`<package-name>^...`) eerst om pakketworkflows te sturen
   een voorspelbare, cachebare warming-up hebben; de `^build`-afhankelijkheid van de taakgrafiek
   blijft het vangnet voor directe Turborepo-aanroepen.

3. **Werkboominrichting**:
   Wanneer nieuwe Git-werkbomen worden ingericht via `pnpm worktree:create` of worden geïnitialiseerd via `pnpm worktree:setup`, worden upstream-afhankelijkheden automatisch voorbereid voordat validatiecontroles worden uitgevoerd, zodat nieuw gemaakte werkbomen onmiddellijk operationeel zijn.

## Prestatie-optimalisatie

- **Code splitsen**: gebruik dynamische `import()` voor niet-kritieke functies en grote bibliotheken.
- **Asset-optimalisatie**: geef de voorkeur aan moderne afbeeldingsformaten (WebP/AVIF) en zorg ervoor dat alle statische assets worden gecomprimeerd.
- **Reactiviteit Overhead**: Gebruik `shallowRef` voor grote objecten die geen diepe reactiviteit vereisen.

## Testen en documentatie

- **Testgestuurde ontwikkeling**: elke nieuwe functie of bugfix moet vergezeld gaan van unit-tests (`.spec.ts`).
- **Diátaxis-documentatie**: auteursdocumentatie volgens het Diátaxis-framework (tutorials, how-to, referentie,
  Uitleg).
- **TSDoc**: gebruik TSDoc/JSDoc voor alle openbare methoden en eigenschappen om IDE-intelligentie te versterken.

## Gerelateerde bronnen

- [Testgids](testing.md)
- [Beste praktijken voor het kader](framework-best-practices.md)
- [Werkruimtestructuur](workspace-structure.md)
- [Problemen oplossen](troubleshooting.md)
