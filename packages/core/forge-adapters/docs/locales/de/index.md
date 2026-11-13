# @mission-platform/forge-adapters

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/core/forge-adapters/docs/index.md: [packages/core/forge-adapters/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Framework-Adapter für die neutrale `@mission-platform/forge-jsx`-Laufzeit.
Komponenten werden einmal gegen Forge JSX erstellt und über den Adapter gerendert
für das Zielframework.

## Exporte

| Eintrag | Zweck |
| ------------------------------------------------- | -------------------------------------------- |
| `@mission-platform/forge-adapters/react` | `toReactComponent` und `renderToReact` |
| `@mission-platform/forge-adapters/vue` | `toVueComponent` und `renderToVue` |
| `@mission-platform/forge-adapters/solid` | SolidJS-Marker- und Strukturprimitive |
| `@mission-platform/forge-adapters/svelte` | Svelte Rendering-Helfer |
| `@mission-platform/forge-adapters/web-components` | Native benutzerdefinierte Elemente und direkte DOM-Laufzeit |

Framework-Pakete sind optionale Peer-Abhängigkeiten. Installieren Sie das verwendete Framework
durch den ausgewählten Adapter und importieren Sie nur seinen Unterpfad.

```ts
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { MyComponent } from '@mission-platform/components';

const VueComponent = toVueComponent(MyComponent);
```
