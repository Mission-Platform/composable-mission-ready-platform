# Matrice de compatibilité WebLua Lua 5.5.1

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/web-lua-compatibility.md: [docs/web-lua-compatibility.md](../../web-lua-compatibility.md)
> Langue: Français (fr)

Ce rapport est intentionnellement conservateur. `matched` signifie que le comportement est couvert par un accessoire au niveau invité et a un résultat attendu déterministe ; `capability-gated` signifie que les effets hôte nécessitent une politique explicite ; `unresolved` signifie que le comportement est suivi mais ne doit pas être traité comme une réussite.

| Zone | Comportement | Statut | Preuve | Remarques |
| ----------------------- | ----------------------------------------------------------------------------- | ---------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| syntaxe lexicale | Espaces, commentaires, mots-clés, littéraux entiers et opérateurs | assorti | `packages/web-lua/src/differential.spec.ts` | Seul le sous-ensemble scalaire implémenté est revendiqué.                                         |
| expressions scalaires | Arithmétique entière, moins unaire, regroupement, priorité et comparaisons | assorti | `packages/web-lua/src/differential.spec.ts` | Les résultats utilisent l’ABI scalaire invité actuel.                                              |
| locaux et contrôle du flux | Affectation locale, réaffectation, `if`/`else`, `while` et retours | assorti | `packages/web-lua/src/differential.spec.ts` | Les capacités locales et de pile des invités restent des limites explicites.                               |
| fonctions nommées | Définitions nommées, paramètres, appels et retours scalaires | assorti | `packages/web-lua/src/differential.spec.ts` | Les fermetures, les hausses de valeur, les varargs, les appels de queue et les retours multiples restent en dehors de cette ligne. |
| erreurs et chargement | Statuts de syntaxe, d'exécution, de division et de préfixe binaire mal formé | assorti | `packages/web-lua/src/utils/web-lua.spec.ts` | Les statuts sont comparés sans interprétation Lua côté hôte.                            |
| bibliothèques orientées hôte | E/S, horloge, caractère aléatoire, système d'exploitation, chargement de packages et effets de débogage | limité aux capacités | `packages/web-lua/src/utils/web-lua.spec.ts` | Les fonctionnalités sont refusées par défaut ; les implémentations de la bibliothèque sont incomplètes.              |
| valeurs et tableaux | Chaînes, flottants, tables, données utilisateur, identité, itération et métaméthodes | non résolu | `packages/web-lua/src/utils/web-lua.spec.ts` | La limite actuelle expose des valeurs scalaires et une base de table à une entrée.           |
| fermetures et coroutines | Valeurs positives, `yield`/`resume`, appels protégés et erreurs de coroutine imbriquées | non résolu | `packages/web-lua/src/utils/web-lua.spec.ts` | `resume` réexécute actuellement un prototype et n'est pas revendiqué comme sémantique de coroutine.  |
| bibliothèques standards | Base, coroutine, table, chaîne, UTF-8, mathématiques, E/S, système d'exploitation, débogage et package/chargement | non résolu | Pas de montage différentiel de bibliothèque standard | Aucun comportement de bibliothèque n’est traité silencieusement comme passant.                                    |

La source générée de ce rapport est la matrice saisie dans `packages/web-lua/src/compatibility.ts` ; ses tests nécessitent une classification explicite et une entrée de preuves pour chaque ligne.
