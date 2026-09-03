# @mission-platform/email-renderer

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/email-renderer/docs/index.md: [packages/email-renderer/docs/index.md](../../index.md)
> Langue: Français (fr)

`@mission-platform/email-renderer` possède la limite de rendu neutre pour les arborescences de messagerie de Mission Platform. Son entrée racine est sûre pour la génération d'e-mails côté serveur ; les adaptateurs de navigateur sont isolés derrière des sous-chemins explicites.

## Rendu du serveur et Markdown

```ts
import { renderEmail, renderMarkdown } from '@mission-platform/email-renderer';

const document = renderMarkdown('# Welcome\n\nRead **more** at [Mission Platform](https://example.com).');
const html = renderEmail(document.node, { title: 'Welcome', previewText: 'A short preview' });
```

Markdown est converti en arborescence Forge partagée, de sorte que les liens, les images, le texte et le HTML sont échappés ou validés avant la sérialisation. La sortie a un ordre déterministe d'attributs/styles et rejette les URL de script, les attributs d'événement, les variables CSS, les valeurs flex/grid et les marqueurs de framework.

## Adaptateurs de navigateur

Utilisez uniquement le sous-chemin de l'adaptateur requis par un aperçu ou une application de navigateur :

- `@mission-platform/email-renderer/vue` → `renderToEmailVue`, `toEmailVueComponent`.
- `@mission-platform/email-renderer/react` → `renderToEmailReact`, `toEmailReactComponent`.
- `@mission-platform/email-renderer/svelte` → `renderToEmailSvelte` pour Svelte 5 `{@render ...}`.
- `@mission-platform/email-renderer/solid` → `renderToEmailSolid`, `toEmailSolidComponent`.
- `@mission-platform/email-renderer/web-components` → `renderToEmailWebComponent`.

Pour une seule importation facultative exposant les cinq adaptateurs de navigateur, utilisez
`@mission-platform/email-renderer/adapters`. Cette entrée est distincte de la
entrée racine afin que la génération d'e-mails sur serveur uniquement ne charge jamais un environnement d'exécution de framework.

Ces points d’entrée facultatifs réutilisent la même arborescence Forge. Ils ne sont pas importés par le sérialiseur de messagerie racine et ne sont pas nécessaires dans les déploiements de messagerie sur serveur uniquement.
