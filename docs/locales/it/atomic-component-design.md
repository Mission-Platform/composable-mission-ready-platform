# Progettazione di componenti atomici

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/atomic-component-design.md: [docs/atomic-component-design.md](../../atomic-component-design.md)
> Lingua: Italiano (it)

Mission Platform utilizza un sistema di **Atomic Design** per organizzare i componenti in livelli gerarchici di complessità. Ogni
Il componente è un'unità "write-once" creata nel dialetto neutro Forge JSX (`@mission-platform/forge`), assicurando
coerenza tra più framework.

## Livelli di progettazione

I componenti sono classificati in cinque livelli in base al loro ambito e responsabilità.

| Livello | Cartella | Descrizione |
|:--------------|:----------------------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Atomi** | `src/components/atoms/`     | Primitive dell'interfaccia utente più piccole (ad es. `ForgeButton`, `ForgeInput`, `ForgeBadge`). Sono tipicamente unità funzionali che non possono essere ulteriormente scomposte senza perdere il loro scopo. |
| **Molecole** | `src/components/molecules/` | Composizioni semplici di atomi (ad es. `ForgeSearchInput`, `ForgeFieldSet`). Funzionano insieme come un'unità.                                                                    |
| **Organismi** | `src/components/organisms/` | Sezioni dell'interfaccia utente complesse composte da atomi, molecole e altri organismi (ad es. `ForgeNavbar`, `ForgeTable`, `ForgeModal`).                                                       |
| **Modelli** | `src/components/templates/` | Layout a livello di pagina che definiscono la struttura del contenuto (ad es. `ForgeHero`, `ForgeAppLayout`). Spesso utilizzano gli slot per definire dove posizionare il contenuto.                     |
| **Pagine** | `src/components/pages/`     | Istanze specifiche di modelli popolati con contenuti e dati concreti (ad es. `AccountSettingsPage`).                                                                        |

## Layout della cartella dei componenti

Ciascun componente risiede nella propria sottodirectory denominata nella cartella di livello appropriato. Questa directory contiene il file
origine dei componenti, storie, test e stili opzionali.

```text
src/components/
├── atoms/
│   └── forge-button/
│       ├── forge-button.tsx          # Component source (Forge JSX)
│       ├── forge-button.stories.tsx  # Storybook stories
│       ├── forge-button.spec.ts      # Unit tests (Vitest)
│       ├── forge-button.module.scss  # Scoped styles (optional)
│       └── index.ts                 # Local barrel (exports component + types)
├── molecules/
├── organisms/
├── templates/
├── pages/
└── index.ts                         # Global barrel re-exporting all levels
```

## Convenzioni sulla storia

Le storie dei libri di fiabe DEVONO essere collocate insieme ai loro componenti e seguire una rigorosa convenzione sui titoli per mantenerle pulite
struttura della barra laterale.

### Nome file

Le storie devono utilizzare il file `.stories.tsx` estensione.

### Convenzione sul titolo

IL `title` campo nel libro di fiabe `meta` l'oggetto deve seguire questo schema:

```text
<Level>/<Category>/<Component>
```

- **Livello**: plurale in maiuscolo (ad es. `Atoms`, `Molecules`).
- **Categoria**: raggruppamento funzionale (ad es. `Forms`, `Navigation`, `Display`, `Feedback`).
- **Componente**: nome del componente PascalCase (es. `ForgeButton`).

**Esempio (`forge-button.stories.tsx`):**

```tsx
const meta = {
  title: 'Atoms/Display/ForgeButton',
  component: Button,
  // ...
};
```

## Standard di creazione

1. **Neutralità del framework**: non separare mai gli autori Vue E React versioni. Utilizzo `@mission-platform/forge`.
2. **Denominazione**: i componenti dovrebbero utilizzare l'estensione `Base` prefisso (ad esempio, `ForgeCard`) a meno che non si tratti di implementazioni specifiche.
3. **Sicurezza del tipo**: Esporta a `*Properties` interfaccia per gli oggetti di scena del componente.
4. **Test**: un test co-localizzato `.spec.ts` è richiesto per ogni componente.
5. **Impalcature**: utilizzare il `scaffold_component` Strumento MCP per garantire la struttura di directory e il boilerplate corretti.

```bash
# Example: Creating a new 'forge-chip' atom in the 'components' package
scaffold_component(name="forge-chip", level="atom", area="Display", package="components", apply=true)
```

## Guide correlate

- [Sviluppo di pacchetti](package-development.md)
- [Authoring componibile](composable-authoring.md)
- [Creazione di archivi](store-authoring.md)
- [Creazione utile](util-authoring.md)
