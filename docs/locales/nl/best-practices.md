# Best practices van het missieplatform

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/best-practices.md: [docs/best-practices.md](../../best-practices.md)
> Taal: Nederlands (nl)

Dit document schetst de kernprincipes, architectuur en coderingsnormen voor de monorepo van Mission Platform. Het
dient als **Verklaring** waarom we bepaalde patronen volgen en als **Richtlijn** voor de dagelijkse ontwikkeling.

## Kernprincipes

### Composeerbare architectuur

Mission Platform volgt een pakketgestuurde, samenstelbare architectuur. Herbruikbare bouwstenen (UI-componenten,
composables, nutsvoorzieningen) leven in `packages/`, terwijl uit deze blokken inzetbare applicaties worden samengesteld `apps/`.

### Afhankelijkheidsdiscipline

Om een ​​onderhoudbare monorepo in stand te houden, handhaven we een strikte eenrichtingsafhankelijkheidsstroom:

- **`apps`** → **`packages`** / **`packages/tooling/vite`** / **`packages/edge/workers`**
- **`packages`** / **`packages/tooling/vite`** / **`packages/edge/workers`** → **`packages/tooling/configs`**
- **`apps`** → **`packages/tooling/configs`** (Direct voor tooling/build-configuratie)

**Regel:** Codeer in `packages/` moet **nooit** importeren van `apps/`. Dit voorkomt circulaire afhankelijkheden en waarborgt
verpakkingen blijven echt herbruikbaar.

### Verhalenboek als werkbank

Bij het toevoegen of wijzigen van componenten in `packages/`, gebruik de Storybook-app (`apps/storybook`) als jouw primaire ontwikkeling
omgeving. De `apps/storybook` app bevat niet de verhalen zelf; het is de aggregerende werkbank die dat doet
ontdekt en geeft de verhalen weer die naast hun componenten leven.

- Plaats ze allemaal samen `.stories.tsx` bestand met zijn component in de pakketmap van die component (bijv.
  `packages/ui/components/src/components/**/<component>/<component>.stories.tsx`), niet onder `apps/storybook`. Dit komt overeen
  de conventie in [Ontwerp van atomaire componenten](atomic-component-design.md).
- Controleer het gedrag van componenten over de hele linie Vue, React, Svelte, Soliden Webcomponenten door de
  `STORYBOOK_FRAMEWORK` omgevingsvariabele. Elke modus moet dezelfde neutrale verhaalinventaris gebruiken; een vermist
  Framework-artefact is een pakket-/exportfout, geen reden om dat verhaal eruit te filteren.

De volledige statische validatielus is:

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

## Ontwikkelingsnormen

### TypeScript Overal

Alle nieuwe broncode moet worden geschreven TypeScript (`.ts`) of Vue SFC's met `<script setup lang="ts">`.

- **Strikte modus**: `strict: true` wordt overal gehandhaafd `tsconfig.json` bestanden.
- **Expliciete typen**: Geef expliciete typen op voor alle openbare API's, geëxporteerde functies en composables.
- **Voorkomen `any`**: Gebruik precieze typen of generieke geneesmiddelen. Als een type echt onbekend is, gebruik dan `unknown` en voer typevernauwing uit.

### Framework-neutrale componenten

Schrijf waar mogelijk UI-componenten met behulp van de `@mission-platform/forge-jsx` dialect. Hierdoor kunnen componenten worden
samengesteld en gebruikt Vue, React, Svelte, Solid, en Web Components zonder de kernlogica te herschrijven. Configureer de
consumentenresolver met de matching `mp:vue`, `mp:react`, `mp:svelte`, `mp:solid`, of `mp:web-component` voorwaarde.

### Reactiviteitspatronen (Vue 3)

- Gebruik uitsluitend de **Composition API**.
- De voorkeur geven aan `ref()` voor de meeste staten om de consistentie te behouden.
- Extraheer complexe stateful logica in **Composables** (`useXxx`).
- Zorg ervoor dat alle bijwerkingen (watchers, intervallen, gebeurtenislisteners) op de juiste manier worden opgeruimd `onUnmounted`.

## Monorepo-workflow

### Isolatie van zorgen

- **Nieuwe UI-componenten**: hoor erbij `packages/`.
- **Gedeelde hulpprogramma's**: hoor erbij `packages/`.
- **Lint/Format/Build Tooling**: gedeelde configuraties horen erbij `packages/tooling/configs/`.

### Linten en opmaak

Consistente codestijl wordt afgedwongen via ESLint En Prettier.

- Loop `pnpm lint` om te controleren op overtredingen.
- Loop `pnpm format:write` om opmaakproblemen automatisch op te lossen.
- Commit-berichten moeten de **Conventionele Commits**-specificatie volgen.

## Prestatie-optimalisatie

- **Code splitsen**: gebruik dynamisch `import()` voor niet-kritieke functies en grote bibliotheken.
- **Asset-optimalisatie**: geef de voorkeur aan moderne afbeeldingsformaten (WebP/AVIF) en zorg ervoor dat alle statische assets worden gecomprimeerd.
- **Reactiviteit Overhead**: Gebruik `shallowRef` voor grote objecten die geen diepe reactiviteit vereisen.

## Testen en documentatie

- **Testgestuurde ontwikkeling**: elke nieuwe functie of bugfix moet vergezeld gaan van unit-tests (`.spec.ts`).
- **Diátaxis-documentatie**: auteursdocumentatie volgens het Diátaxis-framework (tutorials, how-to, referentie,
  Uitleg).
- **TSDoc**: gebruik TSDoc/JSDoc voor alle openbare methoden en eigenschappen om IDE-intelligentie te versterken.

## Gerelateerde bronnen

- [Gids voor testen](testing.md)
- [Kader van beste praktijken](framework-best-practices.md)
- [Structuur van de werkruimte](workspace-structure.md)
- [Problemen oplossen](troubleshooting.md)
