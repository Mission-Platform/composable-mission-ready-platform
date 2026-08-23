# `@mission-platform/layouts`

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/layout/docs/index.md: [packages/layout/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Applicazione indipendente dal framework e layout di pattern per Vue 3 e React, creati con il dialetto Forge JSX e con stile
con token di progettazione Mission Platform.

## Panoramica

Il pacchetto `@mission-platform/layouts` contiene shell di applicazioni, contenitori, layout verticali e quattro riutilizzabili
modelli di modelli reattivi. I suoi componenti vengono esportati attraverso la build del pacchetto condizionato dal framework esistente, quindi
la stessa origine funziona con Vue 3, React, Solid, Svelte e Web Components.

## Caratteristiche

- **Shell dell'applicazione**: `ForgeApplicationLayout`, `ForgeContainer` e `ForgeVerticalLayout`
- **Composizione Bento**: un eroe dominante con caratteristiche e regioni di supporto
- **Griglia regolare**: celle con nome ordinate per raccolte di metriche e schede di stato
- **Composizione modello F**: aree di intestazione, introduzione, articolo, secondaria e piè di pagina in stile documentazione
- **Composizione con motivo a Z**: aree di contenuto alternate superiore, centrale e inferiore
- **Reattività solo CSS**: ridisposizione mobile-first senza `window`, `matchMedia` o stato client
- **Integrazione dei token di progettazione**: spazi, spazi vuoti e margini utilizzano i token di spaziatura della Mission Platform

## Installazione

```bash
pnpm add @mission-platform/layouts
```

## Utilizzo

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

## Riferimento API

### Controlli condivisi

Tutti e quattro i modelli di pattern accettano:

- `tag`: `div`, `section`, `article`, `main` o `aside`
- `gap`, `margin` e `padding`: `2xs`, `xs`, `sm`, `md`, `lg`, `xl` o `2xl`
- `breakpoint`: `xs`, `sm`, `md`, `lg` o `xl`

I componenti iniziano come layout a una colonna o in pila. Al punto di interruzione selezionato applicano il modello specifico
aree della griglia. I wrapper della regione hanno classi di stile BEM prevedibili e vengono emessi solo quando è presente lo slot denominato.

### Contratti regionali

| Componente | Regioni denominate | Fonte composizione |
| --------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| `ForgeBentoLayout` | `hero`, `feature`, `supporting` | Sezioni di eroi e funzionalità di marketing del sito Web |
| `ForgeGridLayout` | Da `cell1` a `cell12` | Schede dashboard di monitoraggio del servizio e riepiloghi dello stato |
| `ForgeFPatternLayout` | `header`, `intro`, `primary`, `secondary`, `footer` | Barra di navigazione/contesto dei documenti, articolo, barra laterale e piè di pagina |
| `ForgeZPatternLayout` | `topStart`, `topEnd`, `middle`, `bottomStart`, `bottomEnd` | Contenuti e azioni alternati della pagina di destinazione |

`ForgeGridLayout` accetta `rows` e `columns`, li vincola entrambi a uno o più, limita l'area renderizzabile a 12 nomi
celle e utilizza un fallback a colonna singola al di sotto del punto di interruzione. Le celle con nome vengono sempre visualizzate nell'ordine di origine.

## Guida alla composizione del prodotto

I modelli estraggono la struttura, non il comportamento dell'applicazione. Schede dei pacchetti del sito Web e contenuti delle domande frequenti, navigazione dei documenti e
il routing, il polling del monitoraggio del servizio, i moduli e lo stato dell'incidente rimangono di proprietà delle relative applicazioni. Quelle applicazioni
possono trasferire il contenuto esistente nelle regioni denominate senza introdurre importazioni da `apps/` a `packages/layout`.

Per l'accessibilità, mantieni il contenuto fornito in ordine di lettura semantico e tratta le aree della griglia CSS solo come posizionamento visivo.
Il contenuto lungo è protetto da `min-width: 0` e `overflow-wrap: anywhere`; SSR non richiede `window` o
`matchMedia`.

## Licenza

Clausola BSD-4
