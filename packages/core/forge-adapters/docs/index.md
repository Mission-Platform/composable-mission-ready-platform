# @mission-platform/forge-adapters

Framework adapters for the neutral `@mission-platform/forge-jsx` runtime.
Components are authored once against Forge JSX and rendered through the adapter
for the target framework.

## Exports

| Entry                                             | Purpose                                      |
| ------------------------------------------------- | -------------------------------------------- |
| `@mission-platform/forge-adapters/react`          | `toReactComponent` and `renderToReact`       |
| `@mission-platform/forge-adapters/vue`            | `toVueComponent` and `renderToVue`           |
| `@mission-platform/forge-adapters/solid`          | SolidJS marker and structure primitives      |
| `@mission-platform/forge-adapters/svelte`         | Svelte rendering helpers                     |
| `@mission-platform/forge-adapters/web-components` | Native custom-element and direct-DOM runtime |

Framework packages are optional peer dependencies. Install the framework used
by the selected adapter and import only its subpath.

```ts
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { MyComponent } from '@mission-platform/components';

const VueComponent = toVueComponent(MyComponent);
```
