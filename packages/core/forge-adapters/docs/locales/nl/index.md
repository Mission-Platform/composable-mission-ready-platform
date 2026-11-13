# @mission-platform/forge-adapters

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/core/forge-adapters/docs/index.md: [packages/core/forge-adapters/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Framework-adapters voor de neutrale `@mission-platform/forge-jsx`-runtime.
Componenten worden één keer geschreven tegen Forge JSX en weergegeven via de adapter
voor het doelkader.

## Exporteert

| Toegang | Doel |
| ------------------------------------------------- | -------------------------------------------- |
| `@mission-platform/forge-adapters/react` | `toReactComponent` en `renderToReact` |
| `@mission-platform/forge-adapters/vue` | `toVueComponent` en `renderToVue` |
| `@mission-platform/forge-adapters/solid` | SolidJS-markering en structuurprimitieven |
| `@mission-platform/forge-adapters/svelte` | Svelte weergavehelpers |
| `@mission-platform/forge-adapters/web-components` | Native aangepast element en directe DOM-runtime |

Framework-pakketten zijn optionele peer-afhankelijkheden. Installeer het gebruikte raamwerk
door de geselecteerde adapter en importeer alleen het subpad ervan.

```ts
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { MyComponent } from '@mission-platform/components';

const VueComponent = toVueComponent(MyComponent);
```
