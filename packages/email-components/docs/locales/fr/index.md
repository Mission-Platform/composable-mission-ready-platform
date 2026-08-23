# @mission-platform/email-components

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/email-components/docs/index.md: [packages/email-components/docs/index.md](../../index.md)
> Langue: Français (fr)

`@mission-platform/email-components` contient des composants Forge JSX typés et neutres en termes de framework pour générer des arborescences sécurisées pour la messagerie. Utilisez `@mission-platform/email-renderer` pour sérialiser ces arborescences sur le serveur ; aucun Vue, React, Svelte, Solid, environnement d'exécution des composants Web, DOM du navigateur ou JavaScript n'est requis par le chemin de courrier électronique.

## Usage

```ts
import { EmailButton, EmailContainer, EmailDocument, EmailTypography } from '@mission-platform/email-components';
import { renderEmail } from '@mission-platform/email-renderer';

const email = EmailDocument({
  previewText: 'A short inbox preview',
  children: EmailContainer({
    children: EmailTypography({ children: 'Hello from Mission Platform.' }),
  }),
});

const html = renderEmail(email, { title: 'Welcome', responsive: true });
```

## Aperçus du navigateur

Les composants renvoient la même arborescence Forge neutre en termes de framework utilisée par le
pipeline de navigateur standard. Pour un aperçu, transmettez cette arborescence au fichier facultatif
point d'entrée de l'adaptateur requis par le framework hôte :

```ts
import { renderToEmailVue } from '@mission-platform/email-renderer/vue';

const previewNode = renderToEmailVue(email);
```

React, Svelte, Solid et les composants Web utilisent leur moteur de rendu correspondant
sous-chemin, ou les cinq peuvent être importés depuis
`@mission-platform/email-renderer/adapters`. Le chemin d'aperçu du navigateur et
Le chemin du serveur `renderEmail` consomme la même arborescence de composants ; seulement ce dernier
ajoute le wrapper complet du document de courrier électronique.

## Composants

- Atomes : `EmailTypography`, `EmailButton`, `EmailImage`, `EmailDivider`, `EmailSpacer`.
- Molécules : `EmailRow`, `EmailColumn`, `EmailCard`, `EmailList`, `EmailSocialLinks`.
- Organismes : `EmailPreheader`, `EmailHeader`, `EmailFooter`.
- Modèles : `EmailDocument`, `EmailContainer`, `EmailSection`.

`EmailTypography` est l'atome de texte unique, reflétant le vocabulaire Web `ForgeTypography` : `as` sélectionne l'élément rendu (`p` par défaut, `a` lorsque `href` est défini), `variant` sélectionne l'échelle de type (l'échelle de titre correspondante lorsque `as` est défini). `h1`–`h6`, sinon `body-md`), et `color`, `align`, `target` et `underline` ajustent les déclarations en ligne.

```ts
EmailTypography({ as: 'h1', children: 'Welcome' });
EmailTypography({ children: 'Body copy' });
EmailTypography({ href: 'https://example.com', target: '_blank', children: 'Read more' });
```

Toute la mise en page est basée sur `table`, `tbody`, `tr` et `td`. Les boutons sont des liens ordinaires à l'intérieur des tableaux, les images nécessitent du texte `alt` non vide, les URL sont validées et les styles sont résolus en déclarations littérales de `@mission-platform/tokens`.

## Politique de compatibilité

La ligne de base suit la [Puis-je envoyer un catalogue de fonctionnalités par e-mail](https://www.caniemail.com/features), révisé sur `2026-08-08`. La mise en œuvre repose sur [Tableaux HTML](https://www.caniemail.com/features/html-tables), [styles en ligne](https://www.caniemail.com/features/css-inline-styles), [largeur maximale](https://www.caniemail.com/features/css-max-width), et en option [requêtes médiatiques](https://www.caniemail.com/features/css-at-media). La sortie statique ne repose pas sur flexbox, grille, propriétés personnalisées CSS, propriétés logiques, scripts, gestionnaires d'événements ou marqueurs d'hydratation du framework.

Le CSS réactif est une amélioration progressive uniquement : la disposition du tableau en ligne reste utilisable lorsque le bloc `<style>` est supprimé ou ignoré. Utilisez `assertCompatibleEmailHtml` dans les tests d'application lors de l'ajout de nœuds personnalisés.
