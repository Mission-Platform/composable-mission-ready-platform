# Atomic Component Design

Mission Platform uses an **Atomic Design** system to organize components into hierarchical levels of complexity. Every
component is a "write-once" unit authored in the neutral Forge JSX dialect (`@mission-platform/forge-jsx`), ensuring
consistency across multiple frameworks.

## Design Levels

Components are categorized into five levels based on their scope and responsibility.

| Level         | Folder                      | Description                                                                                                                                                                    |
|:--------------|:----------------------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Atoms**     | `src/components/atoms/`     | Smallest UI primitives (e.g., `ForgeButton`, `ForgeInput`, `ForgeBadge`). They are typically functional units that cannot be broken down further without losing their purpose. |
| **Molecules** | `src/components/molecules/` | Simple compositions of atoms (e.g., `ForgeSearchInput`, `ForgeFieldSet`). They function together as a unit.                                                                    |
| **Organisms** | `src/components/organisms/` | Complex UI sections composed of atoms, molecules, and other organisms (e.g., `ForgeNavbar`, `ForgeTable`, `ForgeModal`).                                                       |
| **Templates** | `src/components/templates/` | Page-level layouts that define the content structure (e.g., `ForgeHero`, `ForgeAppLayout`). They often use slots to define where content should be placed.                     |
| **Pages**     | `src/components/pages/`     | Specific instances of templates populated with concrete content and data (e.g., `AccountSettingsPage`).                                                                        |

## Component Folder Layout

Each component resides in its own named subdirectory under the appropriate level folder. This directory contains the
component source, stories, tests, and optional styles.

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

## Story Conventions

Storybook stories MUST be co-located with their components and follow a strict title convention to maintain a clean
sidebar structure.

### Filename

Stories must use the `.stories.tsx` extension.

### Title Convention

The `title` field in the Storybook `meta` object must follow this pattern:

```text
<Level>/<Category>/<Component>
```

- **Level**: Capitalized plural (e.g., `Atoms`, `Molecules`).
- **Category**: Functional grouping (e.g., `Forms`, `Navigation`, `Display`, `Feedback`).
- **Component**: PascalCase component name (e.g., `ForgeButton`).

**Example (`forge-button.stories.tsx`):**

```tsx
const meta = {
  title: 'Atoms/Display/ForgeButton',
  component: Button,
  // ...
};
```

## Authoring Standards

1. **Framework Neutrality**: Never author separate Vue and React versions. Use `@mission-platform/forge-jsx`.
2. **Naming**: Components should use the `Base` prefix (e.g., `ForgeCard`) unless they are specific implementations.
3. **Type Safety**: Export a `*Properties` interface for the component's props.
4. **Testing**: A co-located `.spec.ts` is required for every component.
5. **Scaffolding**: Use the `scaffold_component` MCP tool to ensure the correct directory structure and boilerplate.

```bash
# Example: Creating a new 'forge-chip' atom in the 'components' package
scaffold_component(name="forge-chip", level="atom", area="Display", package="components", apply=true)
```

## Related Guides

- [Package Development](package-development.md)
- [Composable Authoring](composable-authoring.md)
- [Store Authoring](store-authoring.md)
- [Util Authoring](util-authoring.md)
