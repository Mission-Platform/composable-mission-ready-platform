# `@mission-platform/layouts`

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/layout/docs/index.md: [packages/layout/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Frameworkneutrale Anwendungs- und Musterlayouts für Vue 3 und React, erstellt mit dem Forge JSX-Dialekt und gestaltet
mit Missionsplattform-Designtoken.

## Überblick

Das `@mission-platform/layouts`-Paket enthält Anwendungs-Shells, Container, vertikale Layouts und vier wiederverwendbare
Responsive Mustervorlagen. Seine Komponenten werden über den vorhandenen Framework-bedingten Paketaufbau exportiert, also
Dieselbe Quelle funktioniert mit Vue 3, React, Solid, Svelte und Webkomponenten.

## Merkmale

- **Anwendungs-Shell**: `ForgeApplicationLayout`, `ForgeContainer` und `ForgeVerticalLayout`
- **Bento-Komposition**: Ein dominanter Held mit besonderen und unterstützenden Regionen
- **Normales Raster**: Geordnete benannte Zellen für Metrik- und Statuskartensammlungen
- **F-Muster-Zusammensetzung**: Kopf-, Einleitungs-, Artikel-, Sekundär- und Fußzeilenbereiche im Dokumentationsstil
- **Z-Muster-Zusammensetzung**: Abwechselnde obere, mittlere und untere Inhaltsbereiche
– **Nur CSS-Reaktionsfähigkeit**: Mobile-First-Reflow ohne `window`, `matchMedia` oder Client-Status
- **Integration von Design-Token**: Lücken, Auffüllungen und Ränder verwenden Mission Platform-Abstands-Token

## Installation

```bash
pnpm add @mission-platform/layouts
```

## Verwendung

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

## API-Referenz

### Gemeinsame Steuerelemente

Alle vier Mustervorlagen akzeptieren:

- `tag`: `div`, `section`, `article`, `main` oder `aside`
- `gap`, `margin` und `padding`: `2xs`, `xs`, `sm`, `md`, `lg`, `xl` oder `2xl`
- `breakpoint`: `xs`, `sm`, `md`, `lg` oder `xl`

Die Komponenten beginnen als einspaltige oder gestapelte Layouts. Am ausgewählten Haltepunkt wenden sie ihr Muster spezifisch an
Gitterflächen. Regions-Wrapper verfügen über vorhersagbare Klassen im BEM-Stil und werden nur ausgegeben, wenn ihr benannter Slot vorhanden ist.

### Regionsverträge

| Komponente | Benannte Regionen | Kompositionsquelle |
| --------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| `ForgeBentoLayout` | `hero`, `feature`, `supporting` | Website-Marketing-Helden und Feature-Bereiche |
| `ForgeGridLayout` | `cell1` bis `cell12` | Service-Monitor-Dashboardkarten und Statuszusammenfassungen |
| `ForgeFPatternLayout` | `header`, `intro`, `primary`, `secondary`, `footer` | Navigationsleiste/Kontext, Artikel, Seitenleiste und Fußzeile der Dokumente |
| `ForgeZPatternLayout` | `topStart`, `topEnd`, `middle`, `bottomStart`, `bottomEnd` | Abwechselnde Landingpage-Inhalte und -Aktionen |

`ForgeGridLayout` akzeptiert `rows` und `columns`, begrenzt beide auf eins oder mehr und begrenzt den darstellbaren Bereich auf 12 benannte
Zellen und verwendet einen einspaltigen Fallback unterhalb seines Haltepunkts. Benannte Zellen werden immer in der Quellreihenfolge gerendert.

## Anleitung zur Produktzusammensetzung

Die Vorlagen extrahieren die Struktur, nicht das Anwendungsverhalten. Website-Paketkarten und FAQ-Inhalte, Dokumentennavigation und
Routing und Service-Monitor-Abfragen, Formulare und der Vorfallstatus bleiben Eigentum ihrer Anwendungen. Diese Anwendungen
können ihre vorhandenen Inhalte an die benannten Regionen übergeben, ohne Importe von `apps/` in `packages/layout` einzuführen.

Halten Sie den bereitgestellten Inhalt aus Gründen der Barrierefreiheit in der semantischen Lesereihenfolge und behandeln Sie CSS-Rasterbereiche nur als visuelle Platzierung.
Lange Inhalte werden durch `min-width: 0` und `overflow-wrap: anywhere` geschützt. SSR erfordert kein `window` oder
`matchMedia`.

## Lizenz

BSD-4-Klausel
