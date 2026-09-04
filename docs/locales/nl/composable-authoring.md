# Composeerbaar schrijven

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/composable-authoring.md: [docs/composable-authoring.md](../../composable-authoring.md)
> Taal: Nederlands (nl)

Composables zijn de belangrijkste manier om reactieve logica binnen het Mission Platform in te kapselen en opnieuw te gebruiken. Om deze te garanderen
logica-eenheden zijn draagbaar binnen alle ondersteunde UI-frameworks, ze zijn geschreven als **write-once**-modules met behulp van de
raamwerkneutrale haken geleverd door `@mission-platform/forge-jsx`.

## Directory-indeling

Elke composable MOET zich in zijn eigen benoemde submap bevinden `src/composables/`, vergezeld van een co-located test
bestand en een lokaal vat.

```text
src/composables/
├── use-focus-trap/
│   ├── use-focus-trap.ts        # Composable logic
│   ├── use-focus-trap.spec.ts   # Required unit tests
│   └── index.ts                 # Local barrel
└── index.ts                     # Package-level re-exports
```

## Auteursregels

1. **Gebruik Forge Hooks**: importeer alleen reactieve primitieven (bijv. `useState`, `useEffect`, `useMemo`, `useRef`) van
   `@mission-platform/forge-jsx`. Importeer nooit rechtstreeks uit `vue` of `react`.
2. **Naamgevingsconventie**: samengestelde namen moeten kebab-case gebruiken en worden voorafgegaan door `use-` (e.g., `use-media-query`).
3. **SSR-veiligheid**: Zorg ervoor dat de logica veilig is voor server-side rendering. Bewaak elke toegang tot browser-only API's zoals `window`,
   `document`, of `localStorage`.
4. **Geen UI-componenten**: Composables moeten zich richten op logica. Retourneer of manipuleer UI-componenten niet rechtstreeks; in plaats daarvan,
   retourstatus, refs of callbacks.
5. **Verplicht testen**: Elke composable moet een co-located hebben `.spec.ts` bestand gebruiken Vitest.

## Basisvoorbeeld

Hier is een typische write-once-composable die een gebeurtenislistener beheert.

```ts
import { type MpRef, useEffect } from '@mission-platform/forge-jsx';

export function useEventListener(
  target: MpRef<EventTarget | null>,
  type: string,
  listener: EventListener,
): void {
  useEffect(() => {
    const element = target.current;
    if (!element) {
      return;
    }

    element.addEventListener(type, listener);
    
    // Clean up on unmount or dependency change
    return () => {
      element.removeEventListener(type, listener);
    };
  }, [target, type, listener]);
}
```

## Steiger

De snelste manier om een ​​nieuwe composable te maken is via de Mission Platform Developer MCP-tool:

```bash
# Example: Creating a new 'use-click-outside' composable in the 'observers' package
scaffold_composable(name="use-click-outside", package="observers", apply=true)
```

## Gerelateerde gidsen

- [Pakketontwikkeling](package-development.md)
- [Ontwerp van atomaire componenten](atomic-component-design.md)
- [Winkelontwerp](store-authoring.md)
- [Util Authoring](util-authoring.md)
