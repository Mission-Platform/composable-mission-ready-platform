# Creazione utile

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> Fonte inglese: [docs/util-authoring.md](../../util-authoring.md)
> Lingua: Italiano (it)

Le utilità (utils) sono funzioni di supporto pure e indipendenti dal framework. Dovrebbero essere esenti da importazioni del framework dell'interfaccia utente e, a meno che
esplicitamente richiesto e documentato, privo di API DOM. Ciò garantisce che possano essere utilizzati in qualsiasi contesto, incluso
logica e lavoratori lato server.

## Disposizione della rubrica

Ogni utilità DOVREBBE risiedere nella propria sottodirectory denominata all'interno `src/utils/`, accompagnato da un file di test co-localizzato e
una botte locale.

```text
src/utils/
├── format-date/
│   ├── format-date.ts        # Pure logic
│   ├── format-date.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## Regole di creazione

1. **Purezza**: preferisci funzioni pure che non abbiano effetti collaterali. Dato lo stesso input, dovrebbero sempre restituire il file
   stessa uscita.
2. **Nessun hook dell'interfaccia utente**: non importare mai `vue`, `react`, O `@mission-platform/forge` hook in un'utilità. Richiede logica
   la reattività appartiene [Componenti componibili](composable-authoring.md).
3. **Digitazione esplicita**: fornire il testo completo TypeScript tipi per tutti gli argomenti e i valori restituiti.
4. **Test obbligatorio**: ogni utilità deve avere un file co-locato `.spec.ts` file.
5. **Responsabilità unica**: ciascuna cartella util dovrebbe concentrarsi su un'attività specifica e ristretta.

## Esempio di base

```ts
/**
 * Clamps a number between a minimum and maximum value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
```

## Impalcature

Utilizza lo strumento MCP Mission Platform Developer per generare un nuovo scheletro di utilità:

```bash
# Example: Creating a new 'string-utils' folder in the 'i18n' package
scaffold_util(name="string-utils", package="i18n", apply=true)
```

## Guide correlate

- [Sviluppo di pacchetti](package-development.md)
- [Progettazione di componenti atomici](atomic-component-design.md)
- [Authoring componibile](composable-authoring.md)
- [Creazione di archivi](store-authoring.md)
