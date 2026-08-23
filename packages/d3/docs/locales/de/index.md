# @mission-platform/d3

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/d3/docs/index.md: [packages/d3/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

`@mission-platform/d3` bietet eine Framework-neutrale Integration zwischen D3 und der einmal beschreibbaren Mission Platform-Komponente
System.

## Architektur

Dieses Paket verbindet zwingendes D3-auswahlbasiertes Rendering mit deklarativen reaktiven UI-Bäumen:

- **Neutrale Implementierung**: Basierend auf `@mission-platform/forge`-Hooks (`useRef`, `useEffect`).
- **Dual-Framework-Ziel**: Transpiliert von `@mission-platform/vite-plugin-forge` in natives React (`./react`) und Vue 3
  (`./vue`) Zusammensetzbare Elemente.
- **Selektive Abhängigkeit**: Importiert `d3-selection` direkt, um die Client-Bundle-Größen minimal zu halten.

## Wichtige APIs

### `useD3`

```ts
function useD3<E extends Element>(draw: D3Draw<E>, dependencies?: MpDependencyList): MpRef<E | null>;
```

Wird an eine DOM/SVG-Elementreferenz angehängt und führt die `draw`-Funktion aus, wobei eine D3-Auswahl (`D3Selection<E>`) übergeben wird
gemountet und wenn sich Abhängigkeiten ändern. `draw` kann optional eine Teardown-Bereinigungsfunktion zurückgeben.

### Margin-Dienstprogramme

#### `resolveMargin(input?: MarginInput): Margin`

Normalisiert teilweise oder fehlende Randobjekte in vollständige `{ top, right, bottom, left }`-Pixelwerte.

#### `innerDimensions(outerWidth: number, outerHeight: number, marginInput?: MarginInput): InnerDimensions`

Berechnet `innerWidth`, `innerHeight` und löst `margin` für SVG-Viewbox-Berechnungen auf.

```ts
interface InnerDimensions {
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
}
```
