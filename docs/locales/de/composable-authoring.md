# Composable Authoring

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/composable-authoring.md: [docs/composable-authoring.md](../../composable-authoring.md)
> Sprache: Deutsch (de)

Composables sind die wichtigste Möglichkeit, reaktive Logik innerhalb der Mission Platform zu kapseln und wiederzuverwenden. Um diese zu gewährleisten
Logikeinheiten sind auf alle unterstützten UI-Frameworks portierbar, sie werden als **einmal beschreibbare** Module mit erstellt
Framework-neutrale Haken bereitgestellt von `@mission-platform/forge`.

## Verzeichnislayout

Jedes Composable MUSS sich in einem eigenen benannten Unterverzeichnis befinden `src/composables/`, begleitet von einem am selben Ort stattfindenden Test
Datei und ein lokales Fass.

```text
src/composables/
├── use-focus-trap/
│   ├── use-focus-trap.ts        # Composable logic
│   ├── use-focus-trap.spec.ts   # Required unit tests
│   └── index.ts                 # Local barrel
└── index.ts                     # Package-level re-exports
```

## Autorenregeln

1. **Forge Hooks verwenden**: Importieren Sie nur reaktive Grundelemente (z. B. `useState`, `useEffect`, `useMemo`, `useRef`) aus
   `@mission-platform/forge`. Importieren Sie niemals direkt von `vue` oder `react`.
2. **Namenskonvention**: Zusammensetzbare Namen müssen die Kebab-Groß-/Kleinschreibung verwenden und mit dem Präfix versehen werden `use-` (e.g., `use-media-query`).
3. **SSR-Sicherheit**: Stellen Sie sicher, dass die Logik für serverseitiges Rendering sicher ist. Schützen Sie jeglichen Zugriff auf reine Browser-APIs wie `window`,
   `document`, oder `localStorage`.
4. **Keine UI-Komponenten**: Composables sollten sich auf Logik konzentrieren. Geben Sie UI-Komponenten nicht direkt zurück oder manipulieren Sie sie. stattdessen,
   Rückgabestatus, Refs oder Rückrufe.
5. **Obligatorische Tests**: Für jedes Composable muss ein Co-Location vorhanden sein `.spec.ts` Datei verwenden Vitest.

## Grundlegendes Beispiel

Hier ist ein typisches einmal beschreibbares Composable, das einen Ereignis-Listener verwaltet.

```ts
import { type MpRef, useEffect } from '@mission-platform/forge';

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

## Gerüst

Der schnellste Weg, ein neues Composable zu erstellen, ist über das Mission Platform Developer MCP-Tool:

```bash
# Example: Creating a new 'use-click-outside' composable in the 'observers' package
scaffold_composable(name="use-click-outside", package="observers", apply=true)
```

## Verwandte Leitfäden

- [Paketentwicklung](package-development.md)
- [Atomares Komponentendesign](atomic-component-design.md)
- [Store-Authoring](store-authoring.md)
- [Util Authoring](util-authoring.md)
