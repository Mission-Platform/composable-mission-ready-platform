# @mission-platform/d3

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/integrations/d3/docs/index.md: [packages/integrations/d3/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

`@mission-platform/d3` biedt raamwerk-neutrale integratie tussen D3 en de Mission Platform write-once-component
systeem.

## Architectuur

Dit pakket overbrugt de noodzakelijke op D3-selectie gebaseerde weergave met declaratieve reactieve UI-bomen:

- **Neutrale implementatie**: gebouwd bovenop `@mission-platform/forge-jsx`-haken (`useRef`, `useEffect`).
- **Dual-Framework Target**: getranspileerd door `@mission-platform/vite-plugin-forge` naar native React (`./react`) en Vue 3
  (`./vue`) composables.
- **Selectieve afhankelijkheid**: importeert `d3-selection` rechtstreeks om de clientbundelgroottes minimaal te houden.

## Belangrijke API's

### `useD3`

```ts
function useD3<E extends Element>(draw: D3Draw<E>, dependencies?: MpDependencyList): MpRef<E | null>;
```

Wordt gekoppeld aan een DOM/SVG-elementref en voert de functie `draw` uit waarbij een D3-selectie (`D3Selection<E>`) wordt doorgegeven
gemonteerd en wanneer afhankelijkheden veranderen. `draw` kan optioneel een opschoningsfunctie retourneren.

### Margehulpprogramma's

#### `resolveMargin(input?: MarginInput): Margin`

Normaliseert gedeeltelijke of ontbrekende margeobjecten naar volledige `{ top, right, bottom, left }`-pixelwaarden.

#### `innerDimensions(outerWidth: number, outerHeight: number, marginInput?: MarginInput): InnerDimensions`

Berekent `innerWidth`, `innerHeight` en opgelost `margin` voor SVG-viewbox-berekeningen.

```ts
interface InnerDimensions {
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
}
```
