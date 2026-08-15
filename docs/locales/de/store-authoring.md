# Store-Authoring

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> Englische Quelle: [docs/store-authoring.md](../../store-authoring.md)
> Sprache: Deutsch (de)

Stores werden verwendet, um den gemeinsamen, komponentenübergreifenden Status innerhalb eines Pakets zu verwalten. Im Gegensatz zu Stores auf Anwendungsebene (wie Pinia oder
Redux) sind Paketspeicher in der Mission Platform als **frameworkneutrale beobachtbare Module** konzipiert. Dies ermöglicht
Einmal beschreibbare Komponenten, um sie unabhängig vom Host-Framework über Forge-Hooks zu nutzen.

## Verzeichnislayout

Jeder Speicher MUSS sich in einem eigenen benannten Unterverzeichnis befinden `src/stores/`, begleitet von einer am selben Ort befindlichen Testdatei und a
lokales Fass.

```text
src/stores/
├── theme-store/
│   ├── theme-store.ts        # Store logic (observable)
│   ├── theme-store.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## Das beobachtbare Muster

Paketspeicher vermeiden Framework-spezifische Abhängigkeiten. Stattdessen folgen sie einem einfachen beobachtbaren Muster:

1. **Privater Status**: Behalten Sie den Status innerhalb des Modulbereichs bei (einfach). TypeScript Werte).
2. **Snapshot-Zugriff**: Stellen Sie a bereit `getSnapshot()` Funktion zum Abrufen des aktuellen Status.
3. **Abonnement**: Geben Sie a an `subscribe(listener)` Funktion, die einer Liste einen Rückruf hinzufügt und eine Abmeldung zurückgibt
   Funktion.
4. **Mutatoren**: Stellen Funktionen zum Aktualisieren des Status bereit, die alle Listener nach der Aktualisierung benachrichtigen MÜSSEN.

## Autorenregeln

1. **Framework-Agnostiker**: Nicht importieren aus `vue`, `react`, oder `@mission-platform/forge` Haken im Store-Modul
   sich selbst.
2. **Explizite Typen**: Definieren und exportieren Sie immer eine Schnittstelle für den Status des Geschäfts.
3. **SSR-Sicherheit**: Zugriff auf Browser-APIs schützen (z. B. `localStorage`) So kann der Store in a initialisiert werden Node.js
   Umgebung.
4. **Obligatorische Tests**: Jedes Geschäft muss über einen Co-Location verfügen `.spec.ts` Datei.

## Beispielshop

```ts
export interface ThemeState {
  theme: 'light' | 'dark' | 'auto';
}

let state: ThemeState = { theme: 'auto' };
const listeners = new Set<() => void>();

export function getThemeSnapshot(): ThemeState {
  return state;
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(theme: ThemeState['theme']): void {
  state = { ...state, theme };
  listeners.forEach((listener) => listener());
}
```

## Verbrauchende Speicher in Komponenten

Um einen Speicher innerhalb einer einmal beschreibbaren Komponente zu verwenden, überbrücken Sie ihn mit `useState` Und `useEffect` aus `@mission-platform/forge`:

```tsx
const [snapshot, setSnapshot] = useState(getThemeSnapshot());

useEffect(() => {
  return subscribeTheme(() => setSnapshot(getThemeSnapshot()));
}, []);
```

## Gerüst

Verwenden Sie das MCP-Tool von Mission Platform Developer, um ein neues Geschäftsgerüst zu erstellen:

```bash
# Example: Creating a new 'auth-store' in the 'components' package
scaffold_store(name="auth-store", package="components", apply=true)
```

## Verwandte Leitfäden

- [Paketentwicklung](package-development.md)
- [Atomares Komponentendesign](atomic-component-design.md)
- [Composable Authoring](composable-authoring.md)
- [Util Authoring](util-authoring.md)
