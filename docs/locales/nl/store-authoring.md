# Winkelontwerp

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/store-authoring.md: [docs/store-authoring.md](../../store-authoring.md)
> Taal: Nederlands (nl)

Winkels worden gebruikt om de gedeelde, componentoverschrijdende status binnen een pakket te beheren. In tegenstelling tot winkels op applicatieniveau (zoals Pinia of
Redux), pakketwinkels in het Mission Platform zijn ontworpen als **framework-neutrale waarneembare modules**. Dit maakt het mogelijk
write-once-componenten om ze via Forge-hooks te gebruiken, ongeacht het hostframework.

## Directory-indeling

Elke winkel MOET zich in zijn eigen benoemde submap binnen `src/stores/` bevinden, vergezeld van een co-located testbestand en een
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

1. **Privéstatus**: houd de status binnen het bereik van de module (gewone TypeScript-waarden).
2. **Momentopnametoegang**: Geef een `getSnapshot()`-functie op om de huidige status op te halen.
3. **Abonnement**: geef een `subscribe(listener)`-functie op die een terugbelverzoek aan een lijst toevoegt en een afmelding retourneert
   functie.
4. **Mutators**: Biedt functies om de status bij te werken, die alle luisteraars na de update MOET informeren.

## Auteursregels

1. **Framework-agnostisch**: importeer niet vanuit `vue`-, `react`- of `@mission-platform/forge-jsx`-haken in de winkelmodule
   zelf.
2. **Expliciete typen**: definieer en exporteer altijd een interface voor de status van de winkel.
3. **SSR-veiligheid**: bewaak de toegang tot browser-API's (bijvoorbeeld `localStorage`) zodat de winkel kan worden geïnitialiseerd in een Node.js
   omgeving.
4. **Verplicht testen**: Elke winkel moet een co-located `.spec.ts`-bestand hebben.

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

Om een ​​opslag binnen een eenmalige-schrijfcomponent te gebruiken, moet u deze overbruggen met behulp van `useState` en `useEffect` uit `@mission-platform/forge-jsx`:

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
