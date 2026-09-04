# Creazione di archivi

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/store-authoring.md: [docs/store-authoring.md](../../store-authoring.md)
> Lingua: Italiano (it)

Gli archivi vengono utilizzati per gestire lo stato condiviso tra componenti all'interno di un pacchetto. A differenza degli store a livello di applicazione (come Pinia o
Redux), gli archivi di pacchetti nella Mission Platform sono progettati per essere **moduli osservabili neutrali rispetto al framework**. Ciò lo consente
componenti write-once per consumarli tramite hook Forge indipendentemente dal framework host.

## Disposizione della rubrica

Ciascun negozio DEVE risiedere nella propria sottodirectory denominata all'interno di `src/stores/`, accompagnata da un file di test co-localizzato e da un
botte locale.

```text
src/stores/
├── theme-store/
│   ├── theme-store.ts        # Store logic (observable)
│   ├── theme-store.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## Il modello osservabile

Gli archivi di pacchetti evitano dipendenze specifiche del framework. Invece, seguono un semplice modello osservabile:

1. **Stato privato**: mantiene lo stato nell'ambito del modulo (valori semplici TypeScript).
2. **Accesso allo snapshot**: fornisce una funzione `getSnapshot()` per recuperare lo stato corrente.
3. **Sottoscrizione**: fornisce una funzione `subscribe(listener)` che aggiunge una richiamata a un elenco e restituisce un'annullamento dell'iscrizione
   funzione.
4. **Mutatori**: Fornisce funzioni per aggiornare lo stato, che DEVE avvisare tutti gli ascoltatori dopo l'aggiornamento.

## Regole di creazione

1. **Indipendente dal framework**: non importare dagli hook `vue`, `react` o `@mission-platform/forge-jsx` all'interno del modulo negozio
   stesso.
2. **Tipi espliciti**: definisci ed esporta sempre un'interfaccia per lo stato del negozio.
3. **Sicurezza SSR**: protegge l'accesso alle API del browser (ad esempio, `localStorage`) in modo che lo store possa essere inizializzato in un Node.js
   ambiente.
4. **Test obbligatorio**: ogni negozio deve avere un file `.spec.ts` co-localizzato.

## Negozio di esempio

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

## Consumo di negozi nei componenti

Per utilizzare un archivio all'interno di un componente riscrivibile una sola volta, collegarlo utilizzando `useState` e `useEffect` da `@mission-platform/forge-jsx`:

```tsx
const [snapshot, setSnapshot] = useState(getThemeSnapshot());

useEffect(() => {
  return subscribeTheme(() => setSnapshot(getThemeSnapshot()));
}, []);
```

## Impalcature

Utilizza lo strumento MCP Mission Platform Developer per generare una nuova struttura del negozio:

```bash
# Example: Creating a new 'auth-store' in the 'components' package
scaffold_store(name="auth-store", package="components", apply=true)
```

## Guide correlate

- [Sviluppo di pacchetti](package-development.md)
- [Progettazione di componenti atomici](atomic-component-design.md)
- [Authoring componibile](composable-authoring.md)
- [Creazione utile](util-authoring.md)
