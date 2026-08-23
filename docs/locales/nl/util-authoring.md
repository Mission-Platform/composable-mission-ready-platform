# Util Authoring

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/util-authoring.md: [docs/util-authoring.md](../../util-authoring.md)
> Taal: Nederlands (nl)

Hulpprogramma's (utils) zijn pure, raamwerk-agnostische hulpfuncties. Ze moeten vrij zijn van import van UI-frameworks en, tenzij
expliciet vereist en gedocumenteerd, vrij van DOM API's. Dit zorgt ervoor dat ze in elke context kunnen worden gebruikt, inclusief
server-side logica en werkers.

## Directory-indeling

Elk hulpprogramma MOET zich in zijn eigen benoemde submap binnen `src/utils/` bevinden, vergezeld van een co-located testbestand en
een lokaal vat.

```text
src/utils/
├── format-date/
│   ├── format-date.ts        # Pure logic
│   ├── format-date.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## Auteursregels

1. **Zuiverheid**: geef de voorkeur aan pure functies die geen bijwerkingen hebben. Gegeven dezelfde invoer moeten ze altijd de
   dezelfde uitgang.
2. **Geen UI-hooks**: importeer nooit `vue`-, `react`- of `@mission-platform/forge`-hooks in een util. Logica vereist
   reactiviteit hoort erbij [Composables](composable-authoring.md).
3. **Expliciet typen**: geef volledige TypeScript-typen op voor alle argumenten en retourneerwaarden.
4. **Verplicht testen**: elk hulpprogramma moet een medegelocaliseerd `.spec.ts`-bestand hebben.
5. **Eén verantwoordelijkheid**: elke util-map moet zich richten op een specifieke, beperkte taak.

## Basisvoorbeeld

```ts
/**
 * Clamps a number between a minimum and maximum value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
```

## Steiger

Gebruik de Mission Platform Developer MCP-tool om een ​​nieuw hulpprogramma-skelet te genereren:

```bash
# Example: Creating a new 'string-utils' folder in the 'i18n' package
scaffold_util(name="string-utils", package="i18n", apply=true)
```

## Gerelateerde gidsen

- [Pakketontwikkeling](package-development.md)
- [Ontwerp van atomaire componenten](atomic-component-design.md)
- [Composeerbaar schrijven](composable-authoring.md)
- [Winkelontwerp](store-authoring.md)
