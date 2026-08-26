# Outils du langage Forge Web Script

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/forge-web-script-lsp/docs/reference/language-service.md: [packages/forge-web-script-lsp/docs/reference/language-service.md](../../../reference/language-service.md)
> Langue: Français (fr)

Forge Web Script (`.fws`) dispose d'un service de langage indépendant de l'éditeur, d'un fichier stdio
Serveur Language Server Protocol (LSP) et un adaptateur Monaco orienté navigateur.
Tous les trois utilisent le contrat exécutable Forge Web Script v1 de
`@mission-platform/forge-web-script`, donc diagnostics, plages sources, symboles,
l'achèvement et les informations de survol sont dérivées du même analyseur et
validateur.

Le contrat de langue pris en charge est la **version 1.0** et le contrat ABI est
**version 1.2**. L'outillage fait
ne modifie pas la grammaire, la sortie du compilateur, l'ABI ou le Rust et
Intégrations AssemblyScript. Voir [Forger le script Web v1](../../../../../forge-web-script/docs/locales/fr/reference/language.md)
pour le langage et la référence ABI.

## Caractéristiques et limites

Le service linguistique propose actuellement :

- diagnostics à partir du lexing, de l'analyse, de la vérification de type et de la validation ABI ;
- Gammes compatibles UTF-16 adaptées à LSP et Monaco ;
- symboles de document pour les modules, fonctions, paramètres, paramètres locaux, capacités
  alias, types d'agrégats, champs, variantes d'énumération, méthodes d'interface, génériques
  paramètres, liaisons d'itérateur, liaisons de correspondance et types primitifs ;
- complétion pour les mots-clés Forge, les types primitifs, les déclarations, les locaux,
  types d'agrégats, types génériques, fonctions, chaîne appartenant au compilateur et regex
  fonctions, alias de capacités et noms de capacités inventoriés par l'hôte ;
- survolez les informations pour les déclarations, les paramètres, les paramètres locaux, les appels et
  la capacité est importée lorsque l'AST identifie le symbole, y compris l'agrégat
  types, types génériques, appels à la bibliothèque standard appartenant au compilateur et rendus
  documentation pour les fonctions définies par la source ; et
- tokenisation lexicale v1 pour les commentaires, chaînes, nombres, mots-clés, types,
  opérateurs, ponctuation, déclarations et texte invalide.

Le serveur LSP expose les diagnostics, l'achèvement, le survol et la sémantique complète
jetons. Aller à la définition, aux références, au renommage, au formatage, aux actions de code,
importations de langues inter-fichiers au niveau source et transport LSP hébergé par un navigateur
ne sont pas mises en œuvre. Monaco utilise à la place l'adaptateur de service linguistique local
de connexion au serveur Node.

Les jetons sémantiques utilisent les classifications lexicales du service linguistique. Le
La réponse d'initialisation annonce une légende contenant `comment`, `declaration`,
`identifier`, `invalid`, `keyword`, `number`, `operator`, `punctuation`,
`string` et `type` ; les clients demandent les jetons de document complets codés avec
`textDocument/semanticTokens/full`.

## Documentation des fonctions dans les résultats de l'éditeur

Le service de langage expose la documentation pour le niveau supérieur défini par la source
fonctions. Il utilise la même chaîne de documentation normalisée pour la déclaration
survol, survol de référence et achèvement de la fonction. Capacité fournie par l'hôte
les signatures continuent d'utiliser leur documentation de chaîne facultative existante et sont
non analysé comme commentaires FWS Javadoc.

Par exemple, cette source :

```fws
/**
 * Adds one to a value.
 *
 * @param value Input value.
 * @return Incremented value.
 * @deprecated Prefer `increment` in new code.
 */
export fn add(value: i32) -> i32 {
  return value + 1;
}

export fn caller() -> i32 {
  return add(1);
}
```

Le survol de `add` lors de sa déclaration ou lors de l'appel dans `caller` renvoie le
signature suivie de la documentation rendue :

```text
export add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

Le survol de `add` sur le site d'appel dans `caller` renvoie la même documentation
avec la signature de non-déclaration :

```text
add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

La complétion pour `add` comporte la même chaîne de documentation à côté de son
détail/signature. Les paragraphes de description et les balises sont séparés par des lignes vides ;
l'ordre des balises, les balises en double et les balises inconnues sont préservés. La syntaxe de base et
règles de normalisation, y compris l'association de fonctions et le sujet pris en charge
formulaires, sont précisés dans [la référence du langage FWS](../../../../../forge-web-script/docs/locales/fr/reference/language.md).

La documentation est constituée uniquement de métadonnées informatives. Cela ne change pas le diagnostic,
vérification de type, résolution de fonctions, déclarations générées, signatures ABI,
manifestes, Wasm/WAT, comportement d’exécution ou hachages exécutables. Un document
edit modifie donc le contenu du survol et de la complétion sans changer le
contrat de module compilé.

### Rendu LSP

Le serveur stdio mappe le résultat du service de langage indépendant du framework au standard
Valeurs LSP :

- `textDocument/hover` renvoie Markdown dont la valeur rejoint la signature et
  documentation avec une ligne vierge ;
- `textDocument/completion` définit le `documentation` de chaque élément de fonction source
  champ à la même chaîne rendue et laisse la signature `detail` existante
  inchangé.

Le serveur LSP ne réinterprète pas les balises et n'applique pas de formatage spécifique à l'éditeur.
Les clients peuvent afficher le Markdown/texte brut renvoyé tel quel.

### Rendu de Monaco

`@mission-platform/content` enregistre le même service de langage en cours
fournisseurs utilisés par `ForgeMonacoEditor` :

- Le survol de Monaco `contents` contient la signature et la documentation rendue comme
  valeurs distinctes compatibles avec Markdown ;
- le champ `documentation` d'une suggestion de fonction source contient le même
  chaîne rendue comme complétion LSP ;
- la classification lexicale des jetons `comment` reste inchangée pour les deux
  commentaires ordinaires et de blocs de documentation.

L'adaptateur Monaco ne se connecte pas au serveur Node LSP et ne duplique pas le
analyseur de documentation. Il transmet le résultat du service de langage, donc le navigateur et
Les clients stdio restent cohérents et utilisent tous deux des plages sources UTF-16.

## Exécutez le serveur stdio

Le serveur est publié sous le nom `@mission-platform/forge-web-script-lsp` et
expose l'exécutable `forge-web-script-lsp`. Il parle le LSP standard sur
stdin/stdout ; les messages de protocole ne sont jamais écrits sur la sortie standard par l'application
journalisation. Les messages de préparation et d'erreur sont écrits dans stderr.

À partir d'une extraction de ce référentiel, créez-le et exécutez-le avec :

```sh
pnpm --filter @mission-platform/forge-web-script-lsp build
node packages/forge-web-script-lsp/dist/main.js
```

Lorsque le package est installé dans un projet externe, configurez le client
pour appeler directement l'exécutable du package :

```sh
forge-web-script-lsp
```

Le serveur nécessite Node.js 24 ou plus récent. Il ne prend pas d'indicateur `--stdio` ;
stdio est toujours le transport. Un client doit envoyer `initialize`, utilisez le
capacités renvoyées, puis envoyez la notification `initialized` normale.
Le serveur prend en charge la synchronisation du texte intégral, les dossiers de l'espace de travail, les fichiers surveillés
modifications de fichiers, achèvement, survol et arrêt/sortie.

### Exemples de configuration de client Stdio

Les clients qui acceptent une commande et des arguments séparément doivent utiliser
`forge-web-script-lsp` pour les packages installés. Une caisse peut utiliser `node` et
le point d'entrée construit à la place :

```json
{
  "command": "node",
  "args": ["${workspaceFolder}/packages/forge-web-script-lsp/dist/main.js"],
  "filetypes": ["fws"],
  "rootPatterns": ["package.json", ".git"]
}
```

Par exemple, le client LSP intégré de Neovim peut utiliser l'exécutable installé :

```lua
vim.lsp.config('forge_web_script', {
  cmd = { 'forge-web-script-lsp' },
  filetypes = { 'fws' },
  root_markers = { 'package.json', '.git' },
})
vim.lsp.enable('forge_web_script')
```

Helix peut utiliser le même exécutable dans `languages.toml` :

```toml
[language-server.forge-web-script-lsp]
command = "forge-web-script-lsp"

[[language]]
name = "fws"
scope = "source.fws"
file-types = ["fws"]
language-servers = ["forge-web-script-lsp"]
```

VS Code nécessite une extension client LSP ; configurer cette extension avec le
mêmes commandes et arguments plutôt que d'ajouter ces champs aux champs ordinaires
`settings.json`.

## Intégrations de l'éditeur

Ce référentiel fournit des clients propriétaires pour VS Code et IntelliJ IDEA.
Les deux clients utilisent ce serveur stdio pour les diagnostics, l'achèvement, le survol et
jetons sémantiques complets ; aucun des deux clients ne contient d'analyseur, de modèle PSI ou de sémantique
mise en œuvre de l’analyse. Le serveur nécessite Node.js **24 ou plus récent**. Un
Le runtime Node spécifique à la plate-forme n'est fourni avec aucune des intégrations d'éditeur.

### Code VS

Installez le fichier `fws-vscode-0.1.0.vsix` à partir du
Sortie de la version `extensions/fws-vscode` avec **Extensions : installer à partir de VSIX**,
puis rechargez VS Code. L'ouverture d'un fichier `.fws` active l'extension. Le
le chemin de lancement par défaut est le serveur fourni dans le VSIX et l'extension
le démarre avec l'exécutable Node configuré sur stdio.

L'extension fournit l'identifiant de langue `fws`, l'association de nom de fichier `.fws`,
commentaires/crochets/mise en évidence lexicale de base et un observateur de fichiers LSP. Le
Le serveur reste responsable des jetons sémantiques et de tout le comportement du langage.
Les dossiers de l'espace de travail sont envoyés dans `initialize` en tant qu'URI `file:`, préservant ainsi le
le contrat de racine de l'espace de travail et d'isolation du chemin du serveur.

Configurez l'extension dans les paramètres de VS Code (ou `settings.json`) :

```json
{
  "forgeWebScript.nodePath": "/path/to/node-24/bin/node",
  "forgeWebScript.serverPath": "",
  "forgeWebScript.serverArgs": [],
  "forgeWebScript.trace.server": "off"
}
```

`forgeWebScript.nodePath` est par défaut `node` et doit être résolu en Node 24 ou
plus récent. Laissez `forgeWebScript.serverPath` vide pour utiliser le serveur packagé ;
définissez-le sur un chemin absolu ou un chemin relatif au premier dossier de l'espace de travail
pour tester un `dist/main.js` construit localement ou fourni par le projet. Supplémentaire
les arguments sont passés après le point d’entrée du serveur. Utilisez `messages` ou `verbose`
pour le traçage LSP ; les échecs de démarrage sont écrits dans le script Web **Forge
Canal de sortie Language Server** et affiché comme une erreur d'éditeur.

Pour le développement local à partir de ce référentiel :

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
```

Le build construit d'abord le package LSP partagé, puis met en scène son point d'entrée
et les dépendances d'exécution sous `extensions/fws-vscode/server`. `package`
produit `extensions/fws-vscode/fws-vscode-0.1.0.vsix` ; sources de développement
et les fichiers de test sont exclus par `.vscodeignore`. Le chèque fumée emballé
initialise le serveur intermédiaire et vérifie l'achèvement annoncé, le survol,
jeton sémantique et comportement de diagnostic stable.

### IDÉE IntelliJ / LSP4IJ

Créez le plugin ZIP et installez-le via **Paramètres | Plugins | Équipement |
Installer le plugin à partir du disque** :

```sh
cd extensions/fws-ij
JAVA_HOME=/path/to/jdk-23 ./gradlew test verifyPlugin buildPlugin --no-daemon --offline
```

Le `build/distributions/fws-ij-0.1.0.zip` résultant contient le mince
Intégration LSP4IJ. Le plugin se compile avec IntelliJ IDEA Community
2024.3.3 (build 243), conserve une plage de compatibilité ouverte à partir de la build
243 et versions ultérieures, et est vérifié par rapport à WebStorm 2026.2.1 (branche 262, y compris
`WS-262.9437.145`). Il épingle LSP4IJ 0.20.1 et ne regroupe pas Node.js ou le
serveur de langue. Redémarrez l'IDE après l'installation s'il ne le fait pas immédiatement
reconnaître les fichiers `.fws`.

Le plugin mappe `*.fws` à l'identifiant de langue `fws` et démarre une stdio partagée
serveur pour le projet. La configuration IntelliJ est fournie exclusivement par
**Paramètres | Outils | Forger un script Web** ; il n'y a pas de script de projet ni de Flora
chemin de configuration. Configurer :

- **Exécutable Node.js** — Node 24 ou plus récent ; la valeur par défaut est `node`.
- **Commande/chemin du serveur de langue** — par défaut `forge-web-script-lsp` et
  résout l'installation d'un projet `node_modules/.bin` (y compris l'ancêtre
  racines de l'espace de travail) ou `PATH`. Un point d'entrée JavaScript explicite tel que
  `node_modules/@mission-platform/forge-web-script-lsp/dist/main.js` est également
  pris en charge.
- **Arguments du serveur** — arguments facultatifs entre guillemets transmis au serveur.
- **Trace LSP** : `off`, `messages` ou `verbose`.
- **Démarrez le serveur de langue lorsqu'un fichier FWS est ouvert** — bascule de démarrage.

Pour une CLI locale au projet, installez le serveur dans le projet ouvert par IntelliJ :

```sh
pnpm add -D @mission-platform/forge-web-script-lsp
```

Le plugin utilise la racine du projet IntelliJ comme répertoire de travail du processus.
LSP4IJ fournit le cycle de vie des documents et les notifications de l'espace de travail ; le
l'hôte lié à la racine du serveur effectue l'énumération des fichiers, fichier surveillé
l'invalidation et toutes les analyses linguistiques. Le même état des paramètres emballés est
utilisé à la fois par le lanceur LSP et par l'adaptateur DAP stdio générique.

### Validation multi-éditeurs

Exécutez les vérifications du service de langage partagé/LSP et les deux pipelines clients à partir du
racine du référentiel. Les commandes IntelliJ nécessitent un JDK pris en charge par le fichier épinglé
Chaîne d'outils Gradle/IntelliJ ; voici un exemple pour macOS :

```sh
pnpm --filter @mission-platform/forge-web-script-language-service test
pnpm --filter @mission-platform/forge-web-script-language-service build:check
pnpm --filter @mission-platform/forge-web-script-language-service lint
pnpm --filter @mission-platform/forge-web-script-language-service format
pnpm --filter @mission-platform/forge-web-script-lsp test
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp lint
pnpm --filter @mission-platform/forge-web-script-lsp format
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-23.jdk/Contents/Home \
  ./extensions/fws-ij/gradlew -p extensions/fws-ij test verifyPlugin buildPlugin --no-daemon --offline
```

Les tests de fumée du serveur intermédiaire et d'IntelliJ exercent la même initialisation,
diagnostic, achèvement, survol, jeton sémantique, arrêt et racine du projet
contrat de lancement. Les tests LSP partagés couvrent en outre le dossier de l'espace de travail
transfert, gestion de l'URI `file:`, invalidation du fichier surveillé contenu dans la racine,
codes/gammes de diagnostic stables et élimination. Les clients de l'éditeur doivent exposer
uniquement les fonctionnalités annoncées par le serveur ; aller à la définition, aux références,
le renommage, le formatage, les actions de code et les importations de langues entre fichiers restent
non pris en charge.

### Dépannage

- **Le runtime Node a été rejeté :** exécutez `<configured-node> --version` et sélectionnez un
  Node 24+ exécutable dans le paramètre VS Code ou IntelliJ approprié. Le client
  signale la version détectée et ne revient pas silencieusement à une version plus ancienne
  exécution.
- **Serveur packagé VS Code manquant :** reconstruction avec
  `pnpm exec turbo run build --filter=fws-vscode`, confirmer
  `extensions/fws-vscode/server/dist/main.js` existe ou est défini
  `forgeWebScript.serverPath` vers un point d’entrée construit valide. Inspectez le
  **Canal de sortie Forge Web Script Language Server** avec traçage activé.
- **Commande du serveur IntelliJ introuvable :** installation
  `@mission-platform/forge-web-script-lsp` dans le projet ouvert, assurez-vous de son
  `node_modules/.bin` est présent, ou configurez une commande/un chemin explicite. Le
  Le plugin rapporte la racine du projet recherché et le chemin d'installation suggéré.
- **Aucun diagnostic ni achèvement :** vérifiez que le fichier s'appelle `.fws`, le
  le client est activé et l'espace de travail a une racine de projet. Vérifiez le client
  canal de trace/sortie et confirmer que le serveur a reçu l'espace de travail `file:`
  dossiers; sans racine, seuls les documents déjà ouverts peuvent être servis.
- **Fonctionnalités inattendues de l'éditeur :** ces intégrations ne le font pas intentionnellement
  ajoutez un analyseur ou une logique sémantique. Comparez les capacités et `FWS-*` stable
  codes de diagnostic avec ce document et le package LSP partagé plutôt que
  ajout d'un comportement spécifique à l'éditeur.

Le client doit envoyer les dossiers d'espace de travail sous la forme d'URI `file:` lorsqu'ils sont pris en charge. Le
le serveur utilise d'abord les dossiers de l'espace de travail et revient à `rootUri` ; si ni l'un ni l'autre ne l'est
à condition que l'hôte du système de fichiers n'ait pas de racine et ne puisse servir que des fichiers déjà ouverts.
documents.

## Comportement et sécurité de l’espace de travail

Le serveur Node crée un hôte d'espace de travail basé sur le système de fichiers à partir des racines dans
la demande d'initialisation du LSP. Il énumère de manière récursive les fichiers sous ces
racines, lit les fichiers nécessaires à l'analyse de l'espace de travail et surveille les fichiers contenus dans la racine.
modifications du fichier. Les chemins sont canonisés et les liens symboliques sont résolus avant les lectures ;
un accès en dehors de chaque racine configurée est rejeté. Schémas d'URI non pris en charge
ne sont pas traités comme des chemins de système de fichiers.

L’identité de l’espace de travail est basée sur l’URI. Deux documents avec le même nom de base mais
les différents URI restent des documents et des entrées de cache distincts. Fermeture d'un
Le document supprime ses diagnostics du client. Créer, modifier ou
la suppression d'un fichier surveillé invalide l'analyse dépendante de l'espace de travail et les republiations
diagnostics pour les documents ouverts.

Le serveur n'introduit pas de fichier de configuration de projet. La CLI standard
fournit actuellement des options d'espace de travail vides, sauf si un hôte est injecté par code.
Le contrat d’espace de travail de service linguistique est :

```ts
interface ForgeWebScriptWorkspaceHost {
  readFile(uri: string): Promise<string | undefined>;
  listFiles(): Promise<readonly string[]>;
  getOptions(uri: string): Promise<ForgeWebScriptWorkspaceOptions>;
  watch?(listener: (change: ForgeWebScriptWorkspaceChange) => void): {
    dispose(): void;
  };
}

interface ForgeWebScriptWorkspaceOptions {
  requestedCapabilities?: readonly string[];
  requireExports?: boolean;
  capabilityNames?: readonly string[];
  capabilitySignatures?: ReadonlyMap<string, ForgeWebScriptCallable>;
}
```

`requestedCapabilities` et `requireExports` sont transmis à
`validateForgeWebScript`. Une importation de capacité non autorisée par le
l'espace de travail produit le diagnostic ABI stable `FWS-ABI-002` ; lié à l'exportation
les exigences utilisent le contrat `FWS-ABI-003` correspondant. Noms des capacités
et les signatures alimentent également l'achèvement et le survol, mais ne sont jamais déduites de
ambient Node ou API du navigateur.

### Politique d'exportation de l'éditeur

L'analyse de l'éditeur est permissive sur les fonctions privées du module par défaut. Quand
`requireExports` est omis de l'hôte LSP standard, un espace de travail injecté
hôte, ou un hébergeur d'espace de travail de Monaco, il est traité comme `false`, donc un assistant privé
peut être appelé par une autre fonction dans le même module sans produire
`FWS-ABI-003`. Les fonctions privées restent disponibles pour les symboles du même module,
l'achèvement, le survol et la résolution d'appel/type, mais ce ne sont pas des exportations Wasm ABI.

Les hôtes qui souhaitent des diagnostics ABI uniquement peuvent définir `requireExports: true` globalement ou
pour un document via `optionsForUri` ; changer cette politique et rafraîchir la
l'espace de travail invalide l'analyse mise en cache. Le paramètre `requireExports: false` est un
politique permissive explicite. Cet éditeur par défaut ne change pas la compilation :
`@mission-platform/forge-web-script` continue de nécessiter `export fn` pour chaque
fonction ABI du compilateur lorsque son option `requireExports` est omise.

Lorsque vous utilisez le noyau ou un serveur LSP créé par programme, appelez
`refreshWorkspace(uri)` après l'ouverture d'un document et avant de s'appuyer sur
diagnostics, achèvement ou survol dérivés de l'espace de travail. L'adaptateur LSP effectue
cette actualisation avant de publier les diagnostics et avant la fin de la diffusion ou
survolez les demandes.

## Diagnostics et gammes

Les diagnostics conservent le `code` stable du validateur, la gravité, la phase, le message,
nom de fichier, étendue source et indice facultatif. La représentation LSP utilise le
`Position` standard à base zéro et `Range` semi-ouvert ; nombre de décalages de caractères
Unités de code UTF-16, y compris lorsque Unicode apparaît avant le diagnostic.

Le serveur LSP publie `source: "forge-web-script"`. La phase et l'indice sont
également inclus dans l'objet de diagnostic `data`. Familles de codes stables typiques
sont :

| Famille de codes | Phases       | Signification                                                                                                           |
| ---------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `FWS-LEX-*`      | `lex`        | Caractères/échappements non valides, terminateurs de ligne de chaîne brute ou chaînes/commentaires de bloc non terminés |
| `FWS-PARSE-*`    | `parse`      | Syntaxe de module, de déclaration, d'instruction ou d'expression non valide                                             |
| `FWS-TYPE-*`     | `type-check` | Types, noms, opérateurs, arguments ou retours non valides                                                               |
| `FWS-ABI-*`      | `abi`        | Noms en double, capacités refusées, exportations ou importations                                                        |

Les entrées mal formées sont toujours tokenisées et analysées là où la récupération de l'analyseur le permet
ça. Par exemple, une source mal formée peut produire `FWS-PARSE-017` tout en conservant
jetons lexicaux utilisables et informations partielles sur les symboles. Les clients doivent afficher
la plage et le code fournis plutôt que le texte de diagnostic correspondant.

Le lexing de chaînes n'accepte que les échappements compatibles JSON (`\\`, `\"`, `\/`, `\b`,
`\f`, `\n`, `\r`, `\t` et `\uXXXX`). Terminateurs de ligne brute, échappements invalides,
et les barres obliques inverses produisent des diagnostics lexicaux (`FWS-LEX-004` ou
`FWS-LEX-005`). Les étendues Lexer et de diagnostic sont limitées par la longueur de la source ;
les clients peuvent les convertir en toute sécurité directement en plages LSP UTF-16.

## Intégration de l'adaptateur Monaco

L'adaptateur de navigateur est exporté par `@mission-platform/content` et réside dans
`packages/content/src/monaco/forge-web-script.ts`. Chargements `ForgeMonacoEditor`
l'adaptateur paresseusement lorsque `language="fws"` ; Monaco reste une importation de type uniquement
le graphique des composants synchrones, donc le rendu côté serveur n'évalue pas
Monaco.

L'utilisation la plus simple des composants est :

```tsx
<ForgeMonacoEditor
  language="fws"
  modelValue={'export fn add(value: i32) -> i32 {\n  return value + 1;\n}'}
/>
```

Définissez `forgeWebScript={false}` pour désactiver l’intégration automatique. Sinon,
le composant enregistre le langage `fws` et l'extension `.fws`, utilise le langage de Monaco
catégories de jetons intégrées pour les thèmes (`keyword`, `type`, `string`, `comment`,
`number`, `operator`, `delimiter` et `invalid`), synchronise les
modèle, publie des marqueurs et enregistre les fournisseurs de complétion et de survol.

Pour les outils de navigateur prenant en compte les fonctionnalités, fournissez un objet d'espace de travail appartenant à l'hôte :

```tsx
const workspaceHost: ForgeWebScriptWorkspaceHost = {
  readFile: async (uri) => files.get(uri),
  listFiles: async () => [...files.keys()],
  getOptions: async () => ({
    requestedCapabilities: ['clock.now'],
    capabilityNames: ['clock.now'],
    capabilitySignatures: new Map([
      [
        'clock.now',
        {
          parameters: [],
          result: 'i64',
          documentation: 'Read the current Unix timestamp.',
        },
      ],
    ]),
  }),
};

<ForgeMonacoEditor
  language="fws"
  forgeWebScript={{ workspaceHost }}
  modelValue={'import capability "clock.now" as now() -> i64;\nexport fn current() -> i64 {\n  return now();\n}'}
/>;
```

L'hôte est délibérément injecté : les consommateurs du navigateur doivent fournir des lectures,
énumération des fichiers, options du projet et notifications de modifications facultatives de
leur propre état de stockage ou d’application. L'adaptateur n'assume jamais les Node
API du système de fichiers et ne se connecte pas au serveur stdio. Jetez le retour
poignée d'adaptateur (ou démonter `ForgeMonacoEditor`) pour retirer les écouteurs de modèle,
fournisseurs, marqueurs et caches de services.

Pour une intégration impérative, utilisez le même adaptateur directement après que Monaco ait
été chargé :

```ts
import { attachForgeWebScriptMonaco, registerForgeWebScriptLanguage } from '@mission-platform/content';

registerForgeWebScriptLanguage(monaco);
const handle = attachForgeWebScriptMonaco(editor, monaco, { workspaceHost });

await handle.refresh();
// On editor teardown:
handle.dispose();
```

`registerForgeWebScriptLanguage` peut être appelé en toute sécurité lorsque `fws` est déjà
enregistré. Le handle d’enregistrement dispose des fournisseurs de jetons ; l'adaptateur
handle dispose en outre des fournisseurs de complétion/survol, des auditeurs de modèles,
marqueurs et son instance de service de langage possédée.

## Espaces de travail LSP et navigateur

| Consommateur      | Implémentation de l'espace de travail                  | Limite racine/sécurité                                                                            | Transports                       |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------- |
| Node Client LSP   | `RootBoundedForgeWebScriptWorkspaceHost`               | Racines du système de fichiers configurées canoniquement ; les lectures extérieures sont rejetées | standard LSP                     |
| Monaco/navigateur | `ForgeWebScriptWorkspaceHost` fourni par l'application | L'hôte décide quels URI/fichiers/options exposer ; aucune hypothèse de système de fichiers        | Adaptateur en cours de processus |

Les deux adaptateurs utilisent les mêmes contrats de service de langage et la même sémantique d'analyse,
mais ils ne partagent pas de stockage de documents ni de transport. Un hébergeur de navigateur ne doit pas
transmettez les fonctions du système de fichiers Node dans un bundle de navigateur. A l’inverse, le Node LSP
Le serveur doit être utilisé pour des clients externes plutôt que d'essayer d'exécuter son
hôte du système de fichiers à Monaco.

## Validation et conformité

Les packages de services linguistiques et LSP incluent des tests d'acceptation et de rejet
montages d'amorçage, codes de diagnostic et plages UTF-16, entrée mal formée,
invalidation de l'espace de travail, isolation racine, synchronisation LSP, achèvement,
survol et élimination. Le package de contenu comprend un adaptateur, une mise en surbrillance,
couverture du marqueur, du fournisseur, de l'élimination et de l'éditeur SSR/non-Forge.

Exécutez les vérifications ciblées à partir de la racine du référentiel :

```sh
pnpm --filter @mission-platform/forge-web-script-language-service test
pnpm --filter @mission-platform/forge-web-script-language-service build:check
pnpm --filter @mission-platform/forge-web-script-language-service lint
pnpm --filter @mission-platform/forge-web-script-language-service format

pnpm --filter @mission-platform/forge-web-script-lsp test
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp lint
pnpm --filter @mission-platform/forge-web-script-lsp format

pnpm --filter @mission-platform/content exec vitest run \
  src/monaco/forge-web-script.spec.ts \
  src/components/organisms/forge-monaco-editor/forge-monaco-editor.spec.ts
pnpm --filter @mission-platform/content build:check
```

Les commandes de lint et de format de contenu à l'échelle du package inspectent également les CSS/SCSS non liés.
fichiers; un échec limité à ces fichiers existants n'est pas un script Web Forge
régression des outils linguistiques. Les attentes du langage faisant autorité
restent dans `../../../forge-web-script/src/fixtures/bootstrap.ts` et le
[référence linguistique](../../../../../forge-web-script/docs/locales/fr/reference/language.md).
