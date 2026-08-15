# Winkelontwerp

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> Engelse bron: [docs/store-authoring.md](../../store-authoring.md)
> Taal: Nederlands (nl)

Winkels worden gebruikt om de gedeelde, componentoverschrijdende status binnen een pakket te beheren. In tegenstelling tot winkels op applicatieniveau (zoals Pinia of
Redux), pakketwinkels in het Mission Platform zijn ontworpen als **framework-neutrale waarneembare modules**. Dit maakt het mogelijk
write-once-componenten om ze via Forge-hooks te gebruiken, ongeacht het hostframework.

## Directory-indeling

Elke winkel MOET zich in zijn eigen benoemde submap bevinden `src/stores/`, vergezeld van een co-located testbestand en een
lokaal vat.

```text
src/stores/
├── theme-store/
│   ├── theme-store.ts        # Store logic (observable)
│   ├── theme-store.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## Het waarneembare patroon

Pakketwinkels vermijden raamwerkspecifieke afhankelijkheden. In plaats daarvan volgen ze een eenvoudig waarneembaar patroon:

1. **Privéstatus**: houd de status binnen het bereik van de module (gewoon TypeScript waarden).
2. **Toegang tot momentopname**: geef een `getSnapshot()` functie om de huidige status op te halen.
3. **Abonnement**: Geef een `subscribe(listener)` functie die een callback aan een lijst toevoegt en een uitschrijving retourneert
   functie.
4. **Mutators**: Biedt functies om de status bij te werken, die alle luisteraars na de update MOET informeren.

## Auteursregels

1. **Framework-agnostisch**: niet importeren uit `vue`, `react`, of `@mission-platform/forge` haken in de winkelmodule
   zelf.
2. **Expliciete typen**: definieer en exporteer altijd een interface voor de status van de winkel.
3. **SSR-veiligheid**: bewaak de toegang tot browser-API's (bijv. `localStorage`) zodat de winkel kan worden geïnitialiseerd in a Node.js
   omgeving.
4. **Verplicht testen**: Elke winkel moet een co-locatie hebben `.spec.ts` bestand.

## Voorbeeld winkel

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

## Winkels in componenten consumeren

Als u een opslag binnen een eenmalige-schrijfcomponent wilt gebruiken, overbrugt u deze met behulp van `useState` En `useEffect` van `@mission-platform/forge`:

```tsx
const [snapshot, setSnapshot] = useState(getThemeSnapshot());

useEffect(() => {
  return subscribeTheme(() => setSnapshot(getThemeSnapshot()));
}, []);
```

## Steiger

Gebruik de Mission Platform Developer MCP-tool om een ​​nieuw winkelskelet te genereren:

```bash
# Example: Creating a new 'auth-store' in the 'components' package
scaffold_store(name="auth-store", package="components", apply=true)
```

## Gerelateerde gidsen

- [Pakketontwikkeling](package-development.md)
- [Ontwerp van atomaire componenten](atomic-component-design.md)
- [Composeerbaar schrijven](composable-authoring.md)
- [Util Authoring](util-authoring.md)
