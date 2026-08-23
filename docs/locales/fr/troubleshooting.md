# Guide de dépannage

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/troubleshooting.md: [docs/troubleshooting.md](../../troubleshooting.md)
> Langue: Français (fr)

Ce guide fournit des solutions aux problèmes courants rencontrés lors du développement, de la construction et du déploiement au sein de la mission.
Plateforme monorepo. Il est structuré sous la forme d'un **guide pratique** pour diagnostiquer et résoudre les problèmes techniques.

## Problèmes de performances

### LCP lent (la plus grande peinture à contenu)

**Problème** : LCP est au-dessus du seuil de 2,5 s pour une note « Bon ».

**Diagnostic**:

1. Exécutez un audit Lighthouse dans Chrome DevTools.
2. Identifiez l'élément LCP dans le panneau "Performances".
3. Vérifiez l'onglet "Réseau" pour connaître les délais de chargement des ressources.

**Solutions** :

- **Inline Critical CSS** : assurez-vous que les styles requis pour le contenu au-dessus de la ligne de flottaison sont intégrés.
- **Optimisation de l'image** : utilisez les formats WebP/AVIF et fournissez `srcset` pour les images réactives.
- **Préchargement des ressources** : utilisez `<link rel="preload">` pour l'image LCP ou les polices critiques.
- **Minimiser le travail du thread principal** : différez le JavaScript non essentiel à l'aide de `async` ou `defer`.

### Fuites de mémoire

**Problème** : L'application consomme des quantités croissantes de mémoire au fil du temps, ce qui finit par entraîner des plantages.

**Diagnostic**:

1. Prenez plusieurs « instantanés de tas » dans l'onglet Mémoire de Chrome DevTools.
2. Comparez les instantanés pour identifier les objets dont le nombre ou la taille augmente.
3. Recherchez « Éléments DOM détachés ».

**Solutions** :

- **Nettoyage dans Composables** : effacez toujours les minuteries et supprimez les écouteurs d'événements dans `onUnmounted`.
- **Gestion du magasin** : assurez-vous que l'état réactif de Pinia ou d'autres magasins est effacé lorsqu'il n'est plus nécessaire.
- **Éliminer les observables** : si vous utilisez RxJS, assurez-vous que tous les abonnements sont désabonnés.

## Problèmes de build et d’espace de travail

### Erreurs de mise en cache Turborepo

**Problème** : les modifications ne sont pas reflétées dans la build, ou la build échoue avec des artefacts obsolètes.

**Solution** : forcez une nouvelle version en contournant le cache ou en l'effaçant manuellement.

```bash
# Force a build without cache
pnpm build:force

# Manually clear the turbo cache
rm -rf .turbo
```

### Module introuvable/Résolution de l'espace de travail

**Problème** : TypeScript ou Vite ne trouve pas de package défini dans l'espace de travail.

**Solutions** :

1. Vérifiez que le package est répertorié dans `package.json` de l'espace de travail consommateur.
2. Assurez-vous que la version correspond (`workspace:*` est recommandé).
3. Exécutez `pnpm install` pour actualiser les liens symboliques.
4. Si les problèmes persistent, essayez un nettoyage en profondeur :
```bash
   pnpm -r exec rm -rf node_modules
   pnpm install
   ```

### Tapez les erreurs dans CI mais pas local

**Problème** : La construction échoue dans CI avec des erreurs TypeScript qui n'apparaissent pas dans votre IDE.

**Solution** : exécutez le vérificateur de type localement sur l'ensemble de l'espace de travail.

```bash
pnpm exec turbo run build:check
```

Cela garantit que toutes les limites des packages sont correctement respectées et que les types sont correctement validés.

## Dépannage du serveur MCP

### Échec de la connexion

**Problème** : Votre client AI ou IDE ne peut pas se connecter au serveur Mission Platform MCP.

**Diagnostic**:

1. Vérifiez que le serveur MCP est construit : `pnpm exec turbo run build --filter @mission-platform/mcp-*`.
2. Vérifiez si le serveur démarre manuellement : `node mcp/developer/dist/index.js`.

**Solutions** :

- Assurez-vous que vous utilisez le chemin absolu vers le binaire node et le script dans la configuration de votre client.
- Vérifiez les journaux du serveur MCP pour des messages d'erreur spécifiques (par exemple, des variables d'environnement manquantes).

## Modèles d'erreur courants

### "Impossible de lire la propriété non définie"

**Cause** : accès aux propriétés d'un objet nul ou non défini, souvent avant la fin du chargement des données. **Correction** : Utiliser
chaînage facultatif (`?.`) ou fournir des valeurs par défaut.

```typescript
// Instead of:
const name = user.profile.name;

// Use:
const name = user?.profile?.name ?? 'Guest';
```

### "Rejet de promesse non géré"

**Cause** : Une fonction asynchrone a généré une erreur qui n'a pas été détectée. **Correction** : enveloppez toujours les appels asynchrones dans des blocs `try/catch`.

```typescript
try {
  await fetchData();
} catch (error) {
  handleError(error);
}
```

## Ressources connexes

- [Meilleures pratiques](best-practices.md)
- [Configuration du développement](development-setup.md)
- [Guide de test](testing.md)
