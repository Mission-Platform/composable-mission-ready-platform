# Authoring componibile

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> Fonte inglese: [docs/composable-authoring.md](../../composable-authoring.md)
> Lingua: Italiano (it)

I componenti componibili rappresentano il modo principale per incapsulare e riutilizzare la logica reattiva all'interno della Mission Platform. Per garantire questi
le unità logiche sono trasferibili su tutti i framework dell'interfaccia utente supportati, sono create come moduli **write-once** utilizzando il file
ganci neutri dal quadro forniti da `@mission-platform/forge`.

## Disposizione della rubrica

Ogni componibile DEVE risiedere nella propria sottodirectory denominata al suo interno `src/composables/`, accompagnato da un test co-localizzato
file e un barile locale.

```text
src/composables/
├── use-focus-trap/
│   ├── use-focus-trap.ts        # Composable logic
│   ├── use-focus-trap.spec.ts   # Required unit tests
│   └── index.ts                 # Local barrel
└── index.ts                     # Package-level re-exports
```

## Regole di creazione

1. **Utilizza Forge Hooks**: importa solo primitive reattive (ad es. `useState`, `useEffect`, `useMemo`, `useRef`) da
   `@mission-platform/forge`. Non importare mai direttamente da `vue` O `react`.
2. **Convenzione sui nomi**: i nomi componibili devono utilizzare kebab-case ed essere preceduti da `use-` (e.g., `use-media-query`).
3. **Sicurezza SSR**: garantisce che la logica sia sicura per il rendering lato server. Proteggi qualsiasi accesso alle API solo del browser come `window`,
   `document`, O `localStorage`.
4. **Nessun componente UI**: i componenti componibili dovrebbero concentrarsi sulla logica. Non restituire o manipolare direttamente i componenti dell'interfaccia utente; invece,
   restituire stato, riferimenti o callback.
5. **Test obbligatorio**: ogni componibile deve avere un co-locato `.spec.ts` file utilizzando Vitest.

## Esempio di base

Ecco un tipico componibile write-once che gestisce un ascoltatore di eventi.

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

## Impalcature

Il modo più veloce per creare un nuovo componibile è tramite lo strumento MCP Mission Platform Developer:

```bash
# Example: Creating a new 'use-click-outside' composable in the 'observers' package
scaffold_composable(name="use-click-outside", package="observers", apply=true)
```

## Guide correlate

- [Sviluppo di pacchetti](package-development.md)
- [Progettazione di componenti atomici](atomic-component-design.md)
- [Creazione di archivi](store-authoring.md)
- [Creazione utile](util-authoring.md)
