# @mission-platform/d3

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/d3/docs/index.md: [packages/d3/docs/index.md](../../index.md)
> Lingua: Italiano (it)

`@mission-platform/d3` fornisce un'integrazione indipendente dal framework tra D3 e il componente write-once di Mission Platform
sistema.

## Architettura

Questo pacchetto collega il rendering imperativo basato sulla selezione D3 con alberi dell'interfaccia utente reattivi e dichiarativi:

- **Implementazione neutra**: costruita sulla base degli hook `@mission-platform/forge` (`useRef`, `useEffect`).
- **Target a doppio framework**: transpilato da `@mission-platform/vite-plugin-forge` in React nativo (`./react`) e Vue 3
  (`./vue`) componibili.
- **Dipendenza selettiva**: importa direttamente `d3-selection` per mantenere minime le dimensioni del pacchetto client.

## API chiave

### `useD3`

```ts
function useD3<E extends Element>(draw: D3Draw<E>, dependencies?: MpDependencyList): MpRef<E | null>;
```

Si collega a un riferimento elemento DOM/SVG ed esegue la funzione `draw` passando una selezione D3 (`D3Selection<E>`) quando
montato e quando le dipendenze cambiano. `draw` può facoltativamente restituire una funzione di pulizia dello smontaggio.

### Utilità di margine

#### `resolveMargin(input?: MarginInput): Margin`

Normalizza gli oggetti con margine parziale o mancante in valori pixel `{ top, right, bottom, left }` completi.

#### `innerDimensions(outerWidth: number, outerHeight: number, marginInput?: MarginInput): InnerDimensions`

Calcola `innerWidth`, `innerHeight` e `margin` risolto per i calcoli della viewbox SVG.

```ts
interface InnerDimensions {
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
}
```
