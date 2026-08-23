# `@mission-platform/layouts`

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/layout/docs/index.md: [packages/layout/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Kaderneutrale applicatie- en patroonlay-outs voor Vue 3 en React, geschreven met het Forge JSX-dialect en opgemaakt
met Mission Platform-ontwerptokens.

## Overzicht

Het `@mission-platform/layouts`-pakket bevat applicatieshells, containers, verticale lay-outs en vier herbruikbare
responsieve patroonsjablonen. De componenten ervan worden geëxporteerd via de bestaande, op een raamwerk geconditioneerde pakketbuild, dus
dezelfde bron werkt met Vue 3, React, Solid, Svelte en Web Components.

## Functies

- **Applicatieshell**: `ForgeApplicationLayout`, `ForgeContainer` en `ForgeVerticalLayout`
- **Bento-compositie**: een dominante held met kenmerken en ondersteunende regio's
- **Regulier raster**: geordende benoemde cellen voor verzamelingen van statistieken en statuskaarten
- **F-patrooncompositie**: koptekst-, intro-, artikel-, secundaire en voettekstgebieden in documentatiestijl
- **Z-patrooncompositie**: afwisselende inhoudsgebieden bovenaan, midden en onderaan
- **Alleen CSS-responsiviteit**: Mobile-first reflow zonder `window`, `matchMedia` of clientstatus
- **Ontwerptokenintegratie**: tussenruimten, opvulling en marges maken gebruik van Mission Platform-afstandstokens

## Installatie

```bash
pnpm add @mission-platform/layouts
```

## Gebruik

### Vue 3

```vue
<script setup lang="ts">
  import { ForgeBentoLayout, ForgeFPatternLayout, ForgeGridLayout } from '@mission-platform/layouts';
</script>

<template>
  <ForgeBentoLayout gap="lg">
    <template #hero><h1>Mission Platform</h1></template>
    <template #feature><p>Composable building blocks</p></template>
    <template #supporting><a href="/docs">Read the docs</a></template>
  </ForgeBentoLayout>

  <ForgeFPatternLayout>
    <template #header><nav>Documentation navigation</nav></template>
    <template #primary><article>Guide content</article></template>
    <template #secondary><aside>On this page</aside></template>
  </ForgeFPatternLayout>

  <ForgeGridLayout
    :rows="2"
    :columns="2"
  >
    <template #cell1><article>Availability</article></template>
    <template #cell2><article>Latency</article></template>
  </ForgeGridLayout>
</template>
```

### React

```tsx
import { ForgeBentoLayout, ForgeZPatternLayout } from '@mission-platform/layouts';

export function LandingPage() {
  return (
    <>
      <ForgeBentoLayout
        hero={<h1>Mission Platform</h1>}
        feature={<p>Composable building blocks</p>}
        supporting={<a href="/docs">Read the docs</a>}
      />
      <ForgeZPatternLayout
        topStart={<h2>Build once</h2>}
        topEnd={
          <img
            src="hero.png"
            alt=""
          />
        }
        middle={<p>Use the same layout from Vue or React.</p>}
        bottomStart={<a href="/docs">Documentation</a>}
        bottomEnd={<button type="button">Get started</button>}
      />
    </>
  );
}
```

## API-referentie

### Gedeelde bedieningselementen

Alle vier patroonsjablonen accepteren:

- `tag`: `div`, `section`, `article`, `main` of `aside`
- `gap`, `margin` en `padding`: `2xs`, `xs`, `sm`, `md`, `lg`, `xl` of `2xl`
- `breakpoint`: `xs`, `sm`, `md`, `lg` of `xl`

De componenten beginnen als lay-outs met één kolom of als gestapelde lay-outs. Op het geselecteerde breekpunt passen ze hun patroonspecifieke toe
rastergebieden. Regiowrappers hebben voorspelbare klassen in BEM-stijl en worden alleen uitgezonden als hun benoemde slot aanwezig is.

### Regio contracten

| Onderdeel | Genoemde regio's | Compositiebron |
| --------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| `ForgeBentoLayout` | `hero`, `feature`, `supporting` | Websitemarketingheld en functiesecties |
| `ForgeGridLayout` | `cell1` tot en met `cell12` | Servicemonitordashboardkaarten en statussamenvattingen |
| `ForgeFPatternLayout` | `header`, `intro`, `primary`, `secondary`, `footer` | Navigatiebalk/context, artikel, zijbalk en voettekst van Documenten |
| `ForgeZPatternLayout` | `topStart`, `topEnd`, `middle`, `bottomStart`, `bottomEnd` | Afwisselende inhoud en acties op de landingspagina |

`ForgeGridLayout` accepteert `rows` en `columns`, klemt beide op één of meer, beperkt het renderbare gebied tot 12 genoemde
cellen, en gebruikt een terugval met één kolom onder het breekpunt. Benoemde cellen worden altijd in bronvolgorde weergegeven.

## Begeleiding bij productsamenstelling

De sjablonen extraheren de structuur, niet het applicatiegedrag. Websitepakketkaarten en veelgestelde vragen, navigatie in documenten en
routering, servicemonitor polling, formulieren en incidentstatus blijven eigendom van hun applicaties. Die toepassingen
kunnen hun bestaande inhoud doorgeven aan de genoemde regio's zonder invoer van `apps/` in `packages/layout` te introduceren.

Voor toegankelijkheid moet u de geleverde inhoud in semantische leesvolgorde houden en CSS-rastergebieden alleen als visuele plaatsing behandelen.
Lange inhoud wordt beschermd door `min-width: 0` en `overflow-wrap: anywhere`; SSR vereist geen `window` of
`matchMedia`.

## Licentie

BSD-4-clausule
