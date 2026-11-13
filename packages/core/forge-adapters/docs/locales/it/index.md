# @mission-platform/forge-adapters

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/core/forge-adapters/docs/index.md: [packages/core/forge-adapters/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Adattatori framework per il runtime neutro `@mission-platform/forge-jsx`.
I componenti vengono creati una volta su Forge JSX e renderizzati tramite l'adattatore
per il quadro obiettivo.

## Esportazioni

| Entrata | Scopo |
| ------------------------------------------------- | -------------------------------------------- |
| `@mission-platform/forge-adapters/react` | `toReactComponent` e `renderToReact` |
| `@mission-platform/forge-adapters/vue` | `toVueComponent` e `renderToVue` |
| `@mission-platform/forge-adapters/solid` | Marcatore SolidJS e primitive di struttura |
| `@mission-platform/forge-adapters/svelte` | Svelte aiutanti per il rendering |
| `@mission-platform/forge-adapters/web-components` | Runtime di elementi personalizzati nativi e DOM diretti |

I pacchetti framework sono dipendenze peer opzionali. Installare il framework utilizzato
dall'adattatore selezionato e importare solo il suo sottopercorso.

```ts
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { MyComponent } from '@mission-platform/components';

const VueComponent = toVueComponent(MyComponent);
```
