# @mission-platform/icons

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/icons/docs/index.md: [packages/icons/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

`@mission-platform/icons` is een verzameling raamwerkneutrale SVG-pictogramcomponenten voor het Mission Platform. Elk pictogram is
één keer geschreven en tijdens de build gecompileerd in native Vue 3, React, Solid, Svelte en Web Component-builds.

## Architectuur & Distributie

Het pakket maakt gebruik van `@mission-platform/vite-plugin-forge` om krachtige, boomschudbare pictogrammen voor iedereen te bieden
ondersteunde raamwerken:

- **Compilatie**: een enkele `pnpm build` zendt één framework-native bundel per doel uit, een deterministische `dist/icons.svg`
  sprite en CSS-items per pictogram.
- **Single Entry, Conditional Resolution**: Er is precies één openbaar toegangspunt,
  `@mission-platform/icons`. Het bevat de `mp:vue`, `mp:react`, `mp:solid` en
  `mp:web-component` exportvoorwaarden; welke uw toolchain ook activeert, bepaalt welke gecompileerde build de kale is
  specificatie lost op. Als er geen voorwaarde is gesteld, valt het terug naar de neutrale smederijbron, wat de andere is
  "eenmalig schrijven"-componenten verbruiken.

## Gebruik

### Een raamwerk kiezen

Selecteer het raamwerk **eenmaal**, niet per import — in Vite tot en met `resolve.conditions` (gebruik
`defineFrameworkAppConfig` of `frameworkResolveConditions` van `@mission-platform/vite-config`) en in TypeScript
via `customConditions` (verleng een `@mission-platform/typescript-config/framework-<name>`
voorinstelling):

```ts
resolve: {
  conditions: frameworkResolveConditions('mp:vue'),
}
```

### Importeert

Elke import is dan kaal en identiek in alle frameworks:

**Vue 3** (`mp:vue` actief):

```vue
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

**React** (`mp:react` actief):

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

### Invoer van neutrale componenten

Bij het schrijven van een raamwerkneutrale component (gecompileerd door `vite-plugin-forge`) is er geen `mp:*`-voorwaarde actief en is de
dezelfde specificatie geeft u de neutrale bron:

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

## Taxonomie en catalogus

Authoringmappen en Storybook-titels volgen `icons/<category>/<subcategory>/<icon-name>`. De beoordeelde catalogusomslagen
`navigation`, `text`, `maps`, `routing`, `drawing`, `content`, `status`, `communication`, `media`, `security`, `data`,
`time` en `objects`. Het hiaatoverzicht wordt vastgelegd in `src/catalog.ts`; het houdt gegevensgestuurde gegevens en records voor landondersteuning bij
toepassingsspecifiek artwork uitgesteld in plaats van één component per land te creëren.

## Sprite-hergebruik

Elke wrapper geeft een toegankelijke buitenste `<svg>` weer met een `<use href="#icon-id">`-referentie. `IconSpriteProvider`-steunen
de canonieke symbolen één keer voor een inline subboom:

```tsx
import { ForgeIconAlert, ForgeIconArrow, IconSpriteProvider } from '@mission-platform/icons';

export function Toolbar() {
  return (
    <IconSpriteProvider>
      <ForgeIconAlert ariaLabel="Alert" />
      <ForgeIconArrow
        direction="right"
        ariaLabel="Next"
      />
    </IconSpriteProvider>
  );
}
```

Voor een externe, cachebare asset gebruikt u `src="/assets/icons.svg"` met `inline={false}`. Externe SVG-fragmentreferenties
toegang van dezelfde oorsprong of een compatibel CORS-beleid vereisen; inline-modus is de fallback voor SSR, restrictieve CSP of browsers
die externe fragmenten niet kunnen oplossen. De pakketbuild zendt `dist/icons.svg` uit, ook beschikbaar als
`@mission-platform/icons/icons.svg`.

## Land- en samenstelling-API's

`ForgeIconFlag` en `ForgeIconCountryGlobe` accepteren ISO-codes in hoofdletters van `SUPPORTED_COUNTRY_CODES`, inclusief
`US`, `CA`, `JP`, `GB` en `ZA`. Niet-ondersteunde runtimewaarden genereren een beschrijvende fout. Landbollen, route/waypoint
patronen en toekomstige overlays zijn getypte symboolcomposities: ze verwijzen naar bestaande ID's met transformaties en worden gecontroleerd
voor ontbrekende referenties en cycli vóór het genereren van sprite.

## API-referentie

Elk pictogram geeft een `<svg role="img">` weer binnen een centrerende `<div>`-wrapper die de BEM-klasse `.forge-icon-<name>` gebruikt.
Alle pictogrammen zijn gebaseerd op een viewbox van $ 24 \maal 24 $.

### Universele rekwisieten

| Prop        | Typ                | Standaard                 | Beschrijving                                                                                                                  |
| :---------- | :----------------- | :------------------------ | :---------------------------------------------------------------------------------------------------------------------------- |
| `size`      | `number \| string` | `'md'`                    | Breedte en hoogte. Ondersteunt benoemde tokens (`'2xs'`, `'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'`, `'2xl'`) of een pixelnummer. |
| `color`     | `string`           | `'currentColor'`          | Lijnkleur (en vulling voor pictogrammen met gevulde markering).                                                               |
| `ariaLabel` | `string`           | _Per-pictogram standaard_ | Toegankelijke naam. Als u dit weglaat, wordt het pictogram gemarkeerd als `aria-hidden`.                                      |

### Gedragspictogrammen

Bepaalde pictogrammen bevatten extra rekwisieten om hun uiterlijk te bepalen:

| Icoon              | Extra rekwisieten                                                       | Beschrijving                                                         |
| :----------------- | :---------------------------------------------------------------------- | :------------------------------------------------------------------- |
| `ForgeIconArrow`   | `direction`: `'up' \| 'right' \| 'down' \| 'left'` (standaard `'up'`)   | Roteert de pijl via een inline-transformatie.                        |
| `ForgeIconChevron` | `direction`: `'up' \| 'right' \| 'down' \| 'left'` (standaard `'down'`) | Roteert de chevron via een inline-transformatie.                     |
| `ForgeIconSort`    | `active`: `boolean`, `direction`: `'asc' \| 'desc' \| undefined`        | Markeert de punthaak die overeenkomt met de actieve sorteerrichting. |

## Pictogrambibliotheek

De bibliotheek bevat een breed scala aan pictogrammen die verschillende categorieën bestrijken:

- **Status en status**: `ForgeIconAlert`, `ForgeIconCheck`, `ForgeIconError`, `ForgeIconInfo`, `ForgeIconWarning`.
- **Navigatie**: `ForgeIconArrow`, `ForgeIconChevron`, `ForgeIconHome`, `ForgeIconMenu`, `ForgeIconExternalLink`.
- **Media**: `ForgeIconCamera`, `ForgeIconImage`, `ForgeIconMail`, `ForgeIconPhone`.
- **UI-bediening**: `ForgeIconClose`, `ForgeIconEdit`, `ForgeIconPlus`, `ForgeIconMinus`, `ForgeIconSearch`,
  `ForgeIconSettings`.
- **Inhoudsopmaak**: `ForgeIconBold`, `ForgeIconItalic`, `ForgeIconBulletList`, `ForgeIconNumberedList`,
  `ForgeIconHeadingOne`...
  `ForgeIconHeadingSix`.
- **Gespecialiseerde gereedschappen**: `ForgeIconWrench`, `ForgeIconPalette`, `ForgeIconDebug`, `ForgeIconQrCode`.

## Ontwikkeling & Onderhoud

### Pictogrammen bouwen

De build die eigendom is van het pakket zendt neutrale declaraties, alle framework-adapters en de SVG-sprite uit. Na het wijzigen van de catalogus of
sprite-bron, voer uit:

```sh
pnpm exec turbo run build:check --filter @mission-platform/icons
pnpm exec turbo run build --filter @mission-platform/icons
```

### Verhalenboek

Pictogrammen worden gecatalogiseerd onder `icons/<category>/<subcategory>/<icon-name>`, terwijl `icons/overview` de volledige galerij blijft.
Het overzicht toont ook herhaalde pictogrammen via één `IconSpriteProvider`; individuele verhalen leggen `size` bloot,
`color`, landcode en `ariaLabel`-controles, indien van toepassing.
