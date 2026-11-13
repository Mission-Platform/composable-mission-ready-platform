# Composable Authoring

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/composable-authoring.md: [docs/composable-authoring.md](../../composable-authoring.md)
> Sprache: Deutsch (de)

Composables sind die primäre Möglichkeit, reaktive Logik innerhalb der Mission Platform zu kapseln und wiederzuverwenden. Um diese zu gewährleisten
Logikeinheiten sind auf alle unterstützten UI-Frameworks portierbar, sie werden als **einmal beschreibbare** Module mit erstellt
Framework-neutrale Hooks, bereitgestellt von `@mission-platform/forge-jsx`.

## Verzeichnislayout

Jedes zusammensetzbare Element MUSS sich in einem eigenen benannten Unterverzeichnis innerhalb von `src/composables/` befinden, zusammen mit einem am selben Ort befindlichen Test
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

1. **Forge-Hooks verwenden**: Importieren Sie nur reaktive Grundelemente (z. B. `useState`, `useEffect`, `useMemo`, `useRef`) aus
   `@mission-platform/forge-jsx`. Importieren Sie niemals direkt aus `vue` oder `react`.
2. **Namenskonvention**: Zusammensetzbare Namen müssen die Kebab-Schreibweise verwenden und das Präfix `use-` haben (z. B. `use-media-query`).
3. **SSR-Sicherheit**: Stellen Sie sicher, dass die Logik für serverseitiges Rendering sicher ist. Schützen Sie jeglichen Zugriff auf reine Browser-APIs wie `window`,
   `document` oder `localStorage`.
4. **Keine UI-Komponenten**: Composables sollten sich auf Logik konzentrieren. UI-Komponenten nicht direkt zurückgeben oder manipulieren; stattdessen,
   Rückgabestatus, Refs oder Rückrufe.
5. **Obligatorische Tests**: Jedes zusammensetzbare Element muss über eine `.spec.ts`-Datei mit Vitest verfügen.

## Grundlegendes Beispiel

Hier ist ein typisches einmal beschreibbares Composable, das einen Ereignis-Listener verwaltet.

```ts
import { type MpRef, useEffect } from "@mission-platform/forge-jsx";

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

Der schnellste Weg, ein neues Composable zu erstellen, ist über das `scaffold_composable`-Tool auf einer verbundenen Missionsplattform
Entwickler-MCP-Server. Dies ist ein Beispiel für einen MCP-Tool-Aufruf, kein Shell-Befehl:

```text
# Example: Creating a new 'use-click-outside' composable in the 'observers' package
scaffold_composable(name="use-click-outside", package="observers", apply=true)
```

## Verwandte Leitfäden

- [Paketentwicklung](package-development.md)
- [Atomkomponentendesign](atomic-component-design.md)
- [Store-Authoring](store-authoring.md)
- [Util Authoring](util-authoring.md)
