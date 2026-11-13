# Atomares Komponentendesign

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/atomic-component-design.md: [docs/atomic-component-design.md](../../atomic-component-design.md)
> Sprache: Deutsch (de)

Mission Platform verwendet ein **Atomic Design**-System, um Komponenten in hierarchische Komplexitätsebenen zu organisieren. Jeder
Komponente ist eine „einmal beschreibbare“ Einheit, die im neutralen Forge JSX-Dialekt (`@mission-platform/forge-jsx`) erstellt wurde, um sicherzustellen
Konsistenz über mehrere Frameworks hinweg.

## Designebenen

Komponenten werden basierend auf ihrem Umfang und ihrer Verantwortung in fünf Ebenen kategorisiert.

| Ebene | Ordner | Beschreibung |
| :------------ | :-------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Atome** | `src/components/atoms/` | Kleinste UI-Grundelemente (z. B. `ForgeButton`, `ForgeInput`, `ForgeBadge`). Typischerweise handelt es sich um Funktionseinheiten, die nicht weiter zerlegt werden können, ohne ihren Zweck zu verlieren. |
| **Moleküle** | `src/components/molecules/` | Einfache Zusammensetzungen von Atomen (z. B. `ForgeSearchInput`, `ForgeFieldSet`). Sie funktionieren als Einheit zusammen.                                                                    |
| **Organismen** | `src/components/organisms/` | Komplexe UI-Abschnitte, die aus Atomen, Molekülen und anderen Organismen bestehen (z. B. `ForgeNavbar`, `ForgeTable`, `ForgeModal`).                                                       |
| **Vorlagen** | `src/components/templates/` | Layouts auf Seitenebene, die die Inhaltsstruktur definieren (z. B. `ForgeHero`, `ForgeAppLayout`). Sie verwenden häufig Slots, um zu definieren, wo Inhalte platziert werden sollen.                     |
| **Seiten** | `src/components/pages/` | Spezifische Instanzen von Vorlagen, die mit konkreten Inhalten und Daten gefüllt sind (z. B. `AccountSettingsPage`).                                                                        |

## Komponentenordnerlayout

Jede Komponente befindet sich in einem eigenen benannten Unterverzeichnis unter dem entsprechenden Ebenenordner. Dieses Verzeichnis enthält die
Komponentenquelle, Storys, Tests und optionale Stile.

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

## Story-Konventionen

Storybook-Geschichten MÜSSEN zusammen mit ihren Komponenten platziert werden und einer strengen Titelkonvention folgen, um einen sauberen Eindruck zu gewährleisten
Seitenleistenstruktur.

### Dateiname

Storys müssen die Erweiterung `.stories.tsx` verwenden.

### Titelkonvention

Das Feld `title` im Objekt Storybook `meta` muss diesem Muster folgen:

```text
<Level>/<Category>/<Component>
```

- **Ebene**: Großgeschriebener Plural (z. B. `Atoms`, `Molecules`).
- **Kategorie**: Funktionale Gruppierung (z. B. `Forms`, `Navigation`, `Display`, `Feedback`).
- **Komponente**: PascalCase-Komponentenname (z. B. `ForgeButton`).

**Beispiel (`forge-button.stories.tsx`):**

```tsx
const meta = {
  title: "Atoms/Display/ForgeButton",
  component: Button,
  // ...
};
```

## Autorenstandards

1. **Framework-Neutralität**: Erstellen Sie niemals separate Vue- und React-Versionen. Verwenden Sie `@mission-platform/forge-jsx`.
2. **Benennung**: Komponenten sollten das Präfix `Base` verwenden (z. B. `ForgeCard`), es sei denn, es handelt sich um spezifische Implementierungen.
3. **Typsicherheit**: Exportieren Sie eine `*Properties`-Schnittstelle für die Requisiten der Komponente.
4. **Testen**: Für jede Komponente ist ein am selben Ort befindliches `.spec.ts` erforderlich.
5. **Gerüst**: Verwenden Sie das MCP-Tool `scaffold_component` über einen verbundenen Mission Platform Developer MCP-Server
   Stellen Sie sicher, dass die Verzeichnisstruktur und das Boilerplate korrekt sind.

```text
# Example: Creating a new 'forge-chip' atom in the 'components' package
scaffold_component(name="forge-chip", level="atom", area="Display", package="components", apply=true)
```

## Verwandte Leitfäden

- [Paketentwicklung](package-development.md)
- [Composable Authoring](composable-authoring.md)
- [Store-Authoring](store-authoring.md)
- [Util Authoring](util-authoring.md)
