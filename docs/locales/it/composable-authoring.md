# Authoring componibile

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/composable-authoring.md: [docs/composable-authoring.md](../../composable-authoring.md)
> Lingua: Italiano (it)

I componenti componibili rappresentano il modo principale per incapsulare e riutilizzare la logica reattiva all'interno della Mission Platform. Per garantire questi
le unità logiche sono trasferibili su tutti i framework dell'interfaccia utente supportati, sono create come moduli **write-once** utilizzando il file
ganci neutrali rispetto al framework forniti da `@mission-platform/forge-jsx`.

## Disposizione della rubrica

Ciascun componibile DEVE risiedere nella propria sottodirectory denominata all'interno di `src/composables/`, accompagnato da un test co-locato
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

1. **Utilizza Forge Hooks**: importa solo primitive reattive (ad esempio, `useState`, `useEffect`, `useMemo`, `useRef`) da
   `@mission-platform/forge-jsx`. Non importare mai direttamente da `vue` o `react`.
2. **Convenzione sui nomi**: i nomi componibili devono utilizzare kebab-case ed avere il prefisso `use-` (ad esempio, `use-media-query`).
3. **Sicurezza SSR**: garantisce che la logica sia sicura per il rendering lato server. Proteggi qualsiasi accesso alle API solo browser come `window`,
   `document` o `localStorage`.
4. **Nessun componente UI**: i componenti componibili dovrebbero concentrarsi sulla logica. Non restituire o manipolare direttamente i componenti dell'interfaccia utente; invece,
   restituire stato, riferimenti o callback.
5. **Test obbligatorio**: ogni componente componibile deve avere un file `.spec.ts` co-localizzato utilizzando Vitest.

## Esempio di base

Ecco un tipico componibile write-once che gestisce un ascoltatore di eventi.

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

## Impalcature

Il modo più veloce per creare un nuovo componibile è tramite lo strumento `scaffold_composable` su una Mission Platform connessa
Server MCP dello sviluppatore. Questo è un esempio di chiamata allo strumento MCP, non un comando shell:

```text
# Example: Creating a new 'use-click-outside' composable in the 'observers' package
scaffold_composable(name="use-click-outside", package="observers", apply=true)
```

## Guide correlate

- [Sviluppo pacchetto](package-development.md)
- [Progettazione di componenti atomici](atomic-component-design.md)
- [Creazione archivio](store-authoring.md)
- [Creazione utile](util-authoring.md)
