# Forger le script Web v1

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> Source anglaise: [docs/forge-web-script.md](../../forge-web-script.md)
> Langue: Français (fr)

Forger un script Web (`.fws`) est un petit langage à usage général pour WebAssembly
charges de travail. Il est axé sur le Web, basé sur les fonctionnalités et délibérément indépendant de
Vue, React, le DOM et le compilateur de composants Forge. Ce document est le
contrat de langage et de module v1 faisant autorité. Le TypeScript emballer
`@mission-platform/forge-web-script` contient l'analyseur bootstrap exécutable,
vérificateur de type, types de manifeste ABI et dispositifs de conformité.

## Statut et versionnage

Le contrat actuel est **version linguistique `1.0`** et **version logique ABI
`1.0`**. La version linguistique décrit la source et la sémantique ; la version ABI
décrit la limite WebAssembly et le protocole hôte. Ils sont versionnés
indépendamment. Un compilateur doit écrire les deux versions dans chaque module généré
manifeste, et un chargeur doit valider les deux avant l’instanciation.

Le format source est du texte UTF-8 avec le `.fws` extension. Un fichier source est un
module unique. L'entrée du compilateur identifie la version linguistique, tandis que l'entrée
Le manifeste généré est le marqueur de version persistant consommé par les chargeurs. Avenir
les révisions peuvent ajouter un pragma source, mais la v1 n'en nécessite pas ; un compilateur v1
doit rejeter une construction source qu'il ne comprend pas plutôt que de deviner son
version.

## Référence lexicale

Les espaces sont insignifiants, sauf à l'intérieur des chaînes. `//` commence un commentaire qui
court jusqu'au bout de la ligne. Les identifiants commencent par `A-Z`, `a-z`, ou `_`, et
continuez avec ces caractères ou chiffres décimaux. Les identifiants sont
sensible à la casse. Les littéraux entiers sont des séquences décimales non négatives ; la v1 le fait
n'accepte pas la syntaxe littérale hexadécimale, octale ou à virgule flottante dans le
sous-ensemble bootstrap. Les chaînes utilisent des guillemets doubles et des échappements compatibles JSON et
sont des valeurs UTF-8.

Les mots réservés sont `as`, `capability`, `else`, `export`, `fn`, `if`,
`import`, `let`, `module`, et `return`. `true` et `false` sont booléens
littéraux. La ponctuation est `{ } ( ) : ; ,`; les opérateurs sont `! % * + - / < <= ==
!= > >= && || = ->`.

Chaque plage de diagnostic est une plage de décalage semi-open source `[start, end)` dans le
UTF-16 d'origine TypeScript chaîne (les décalages comptent les unités de code UTF-16), avec
champs de ligne et de colonne à base unique. Le
L'implémentation du bootstrap rapporte les décalages et les données de ligne/colonne ensemble afin qu'un
Vite L'adaptateur peut produire des diagnostics mappés à la source sans analyse.

## Grammaire source

La grammaire suivante décrit la surface d'amorçage v1. La grammaire utilise
`*` et `?` au sens habituel de l'EBNF :

```ebnf
module       = "module", identifier, "{", { import | function }, "}" ;
import       = "import", "capability", string, "as", identifier,
               "(", [ parameters ], ")", "->", type, ";" ;
function     = [ "export" ], "fn", identifier, "(", [ parameters ], ")",
               "->", type, block ;
parameters   = parameter, { ",", parameter } ;
parameter    = identifier, ":", type ;
block        = "{", { statement }, "}" ;
statement    = "let", identifier, ":", type, "=", expression, ";"
             | "return", [ expression ], ";"
             | "if", expression, block, [ "else", block ]
             | expression, ";" ;
type         = "bool" | "bytes" | "f32" | "f64" | "i32" | "i64"
             | "string" | "u32" | "u64" | "unit" ;
expression   = literal | identifier | call | unary | binary ;
call         = identifier, "(", [ expression, { ",", expression } ], ")" ;
unary        = ( "!" | "-" ), expression ;
literal      = integer | string | "true" | "false" ;
```

Les opérateurs binaires suivent ces niveaux de priorité, du plus fort au plus faible :
`* / %`, `+ -`, comparaisons ordonnées, égalité, `&&`, et `||`. Les opérateurs sont
associatif à gauche. Les expressions entre parenthèses sont réservées au prochain bootstrap
révision; un compilateur doit émettre un diagnostic d'analyse plutôt que silencieusement
les accepter aujourd'hui.

## Types et sémantique

V1 a les types primitifs `bool`, signé `i32`/`i64`, non signé `u32`/`u64`,
`f32`/`f64`, `string`, `bytes`, et `unit`. Il n'y a pas de chiffre implicite
conversions. Les opérandes arithmétiques doivent avoir le même type numérique ; comparaisons
produire `bool`; les opérateurs logiques nécessitent `bool`; l'égalité exige l'égalité
genres. Une fonction a un type de résultat déclaré et un `unit` la fonction renvoie
sans valeur.

`string` et `bytes` sont les valeurs globales v1. Une chaîne est un immuable
séquence de valeurs scalaires Unicode représentées sous forme UTF-8 à la limite ABI.
Les octets sont une séquence d'octets immuable et peuvent contenir n'importe quelle valeur de
`0x00` à travers `0xff`. Leurs opérations au niveau de la source sont intentionnellement petites
dans le sous-ensemble bootstrap ; les appels d'hôte et les modules de bibliothèque standard ultérieurs fournissent
opérations d'encodage, de découpage et de collecte sans ajouter de navigateur ambiant
API du langage.

Les éléments locaux sont limités à une fonction, initialisés exactement une fois et ne peuvent pas être lus avant
leur déclaration. Une déclaration locale ne masque aucun nom existant : dupliquer
les noms sont une erreur. Les fonctions et les alias de capacités partagent un espace de noms de module
et doit être unique. Un appel doit nommer une fonction déclarée ou importée
capacité, et ses types d’arité et d’argument doivent correspondre exactement.

La surface de flux de contrôle v1 est structurée `if`/`else` et tôt `return`.
Il n’y a pas de résultat implicite : chaque chemin accessible dans un environnement non-`unit`
la fonction doit renvoyer le type déclaré. Les rapports du vérificateur d'amorçage reviennent
erreurs de saisie ; l’analyse d’accessibilité est un suivi obligatoire avant de déclarer un
compilateur entièrement conforme à la v1.

## Déclarations et exports de modules

Seules les déclarations précédées de `export` sont publiques. Les noms d'exportation sont stables,
chaînes sensibles à la casse et sont triées lexicographiquement dans un fichier généré
manifeste. Les fonctions privées peuvent être utilisées par les fonctions exportées mais ne le sont pas.
visible pour l'hôte. Il n’y a pas d’exportation de caractères génériques ni d’importation ambiante.

Les importations de fonctionnalités ont un nom cité appartenant à l'hôte et un alias invité local :

```fws
import capability "clock.now" as now() -> i64;

export fn current_time() -> i64 {
  return now();
}
```

Le nom de la capacité cité, l'alias, les noms/types de paramètres et le type de résultat sont
le tout inclus dans le manifeste. Les importations sont déterministes : alias en double ou
les déclarations de capacités sont rejetées et les noms de capacités requis sont
dédupliqués et triés. L'hôte fournit les implémentations par nom de fonctionnalité ;
l'invité ne peut pas découvrir ou appeler une capacité absente de son
manifeste.

## Capacité logique ABI

Forge Web Script utilise une limite _logique_ inspirée de WASI, et non une revendication de
Compatibilité WASI. Une capacité est une fonction hôte étroite et explicite telle que
`clock.now`, `random.bytes`, ou `storage.read`. Les noms de capacités appartiennent à
la plate-forme, et chaque nom a une signature versionnée séparément. objets DOM,
`window`, `document`, Node intégrés, clients réseau et autres navigateurs globaux
ne sont jamais des dépendances d’invités ambiantes.

Le chargeur effectue ces vérifications avant l'instanciation :

1. Le format du manifeste, la version linguistique et la version ABI sont pris en charge.
2. Chaque fonctionnalité requise est présente dans le registre hôte.
3. Chaque fonctionnalité fournie a la signature déclarée exacte et aucune
   l’importation d’invités est acceptée.
4. Les déclarations de mémoire, d'allocateur, d'exportation et d'importation sont internes
   cohérent.

La découverte de capacités est une opération explicite de l'hôte. Un hôte peut exposer un
inventaire des capacités au code de l'application, mais l'invité ne reçoit que le
importations déclarées par son module. Les fonctionnalités manquantes ou refusées échouent avec un
temps de chargement `CapabilityDenied` piège; ils ne deviennent pas `undefined` ou un
silence, non-opération.

## Valeurs, mémoire linéaire et propriété

Le module utilise une mémoire linéaire WebAssembly avec des pages de 64 Ko et un format Little-Endian
valeurs scalaires. Les valeurs scalaires sont mappées comme suit :

| Forger un script Web | Représentation WebAssembly |
| ----------------- | ------------------------------------------ |
| `bool`            | `i32`, où `0` est faux et `1` est vrai |
| `i32`, `u32`      | `i32`                                      |
| `i64`, `u64`      | `i64`                                      |
| `f32`, `f64`      | flottant WebAssembly correspondant |
| `unit`            | aucune valeur de résultat |
| `string`, `bytes` | deux `u32` valeurs : pointeur puis longueur en octets |

Le manifeste déclare le même mappage dans `valueRepresentations`. Un
La paire de longueur de pointeur est toujours vérifiée en tant que plage non signée avant la lecture ou
écrire : `pointer <= memory.byteLength` et `length <= byteLength - pointer`.
La longueur nulle est valide et peut utiliser n'importe quel pointeur entrant, y compris la fin de
mémoire. Une vérification échouée piège avec `MemoryOutOfBounds` et n'expose jamais un
valeur partiellement décodée.

Le module généré s'exporte `fws_alloc(size: u32) -> u32` et
`fws_dealloc(pointer: u32, size: u32) -> unit` comme limite de propriété pour
tampons. L'appelant qui alloue un tampon en est propriétaire et doit le libérer
en utilisant le même module. Les implémentations hôtes doivent copier les octets d'entrée avant le
l'appel invité revient à moins que le manifeste n'introduise explicitement un futur emprunté
contrat tampon. Le code invité ne doit pas conserver de pointeur appartenant à l'hôte après un hôte
appeler. Pièges d’échec d’allocation avec `MemoryExhausted`; double gratuit et invalide
piège gratuit avec `InvalidOwnership`.

Les exceptions d'hôte sont converties en `HostError` avec le nom de la capacité et un
code d'erreur hôte opaque. Les pièges à invités ne sont jamais convertis en retour ordinaire
valeurs. Les hôtes peuvent enregistrer les détails des pièges, mais ils ne doivent pas divulguer de secrets ou de données brutes.
exceptions du navigateur au code invité non fiable.

## Format du manifeste

Chaque module généré possède un manifeste ABI stable compatible JSON avec son
Artefact WASM et chargeur ESM typé :

```json
{
  "format": "forge-web-script-module",
  "languageVersion": "1.0",
  "abiVersion": "1.2",
  "moduleName": "clocked",
  "exports": [{ "name": "current_time", "parameters": [], "result": "i64" }],
  "imports": [
    {
      "capability": "clock.now",
      "alias": "now",
      "function": { "name": "now", "parameters": [], "result": "i64" }
    }
  ],
  "requiredCapabilities": ["clock.now"],
  "memory": {
    "pageSize": 65536,
    "addressType": "u32",
    "ownership": "caller-owned",
    "stringEncoding": "utf8",
    "byteArrayRepresentation": "pointer-length",
    "allocatorExport": "fws_alloc",
    "deallocatorExport": "fws_dealloc",
    "reallocatorExport": "fws_realloc"
  },
  "valueRepresentations": { "i64": "i64", "string": "pointer-length-u32" },
  "trapModel": "explicit-trap"
}
```

Le manifeste réel contient toutes les entrées de représentation primitive, non seulement
ceux utilisés dans l'exemple. Les clés JSON pour les exportations, les importations et les fonctionnalités sont
stable lors de builds répétés ; les cartes sources et les hachages de contenu sont émis par
l'adaptateur du compilateur et ne font pas partie de la correspondance de signature ABI.

## Diagnostic

Les diagnostics sont des enregistrements structurés avec `code`, `severity`, `phase`, `message`,
`fileName`, et une source `span`; les enregistrements exploitables peuvent également inclure `hint`.
La phase est l'une de `lex`, `parse`, `type-check`, ou `abi`. Code v1 stable
les familles comprennent:

| Famille de codes | Signification |
| ------------- | ------------------------------------------------------------ |
| `FWS-LEX-*`   | caractères invalides ou chaînes non terminées |
| `FWS-PARSE-*` | syntaxe de module, de déclaration, d'instruction ou d'expression non valide |
| `FWS-TYPE-*`  | type primitif, nom, opérateur, argument ou retour non valide |
| `FWS-ABI-*`   | noms en double, capacités refusées, exportations ou importations |

Les erreurs empêchent la génération d’artefacts. Les avertissements et les diagnostics informatifs
ne change pas la sémantique. L'ordre des diagnostics est l'ordre des sources, suivi de la phase
commande de diagnostics attachés à la même travée. UN Vite l'adaptateur doit préserver
le code stable et le span lors de la transmission d'une erreur à Vite.

## Contrat de conformité Bootstrap

La cible du compilateur bootstrap est intentionnellement plus petite que la cible finale
compilateur auto-hébergé. Un programme est dans le sous-ensemble bootstrap s'il en utilise un
module, les règles lexicales ci-dessus, les types primitifs, `string`/`bytes` des valeurs,
fonctions explicitement exportées, importations de capacités, déclarations locales, appels,
expressions, `if`/`else`, et `return`. Cela ne doit pas dépendre d'un principe implicite
navigateur ou Node mondial.

`packages/forge-web-script/src/fixtures/bootstrap.ts` est l'exécutable
corpus de conformité. Les appareils acceptés doivent être validés sans diagnostic d'erreur ;
les appareils rejetés doivent signaler leurs codes de diagnostic stables répertoriés et valides
étendues de source. Les implémentations dans d'autres langages peuvent consommer le même appareil
façonner et comparer les AST normalisés, les diagnostics et le manifeste JSON. Le luminaire
suite est une cible de conformité, et non un instantané spécifique à l'implémentation.

## Politique de compatibilité

Les versions majeures de langue et d'ABI sont incompatibles par défaut. Un chargeur peut accepter
le même ABI majeur avec une version mineure supérieure uniquement lorsque le producteur marque le
les nouveaux champs sont facultatifs et le consommateur ignore les champs inconnus en toute sécurité. Supprimer un
exporter, modifier un type, changer de propriétaire ou modifier une capacité
la signature nécessite une version majeure d'ABI. Ajouter une fonctionnalité jamais silencieusement
modifie un module existant : il nécessite une nouvelle déclaration de manifeste et un nouvel hôte
approbation.

Les versions du compilateur ne sont pas des versions ABI. Les compilateurs doivent inclure leur version dans
l'entrée de compilation et le hachage de l'artefact, mais les chargeurs comparent le langage et l'ABI
versions plus la signature manifeste. Un échec de la vérification de compatibilité est un
diagnostic au moment du chargement, pas une solution de secours à l'exécution. Modules Rust et AssemblyScript
continuer à utiliser leurs wrappers existants et leurs contrats ABI pendant la coexistence
période; Forge Web Script ne les réinterprète ni ne les remplace.

## Feuille de route du bootstrap vers l'auto-hébergement

1. **Contrat Bootstrap :** conservez le TypeScript lexer, analyseur, vérificateur de type,
   constructeur de manifeste, appareils et diagnostics en tant que conformité exécutable
   cible. Ajoutez un émetteur WASM uniquement après les programmes acceptés et les entrées mal formées
   avoir un comportement stable.
2. **Bibliothèque standard Bootstrap :** implémente un entier/flottant déterministe
   opérations, codecs UTF-8 et octets, allocation et propagation des interruptions sans
   API du navigateur. Testez chaque opération via l'ABI logique et les faux hôtes.
3. **Sous-ensemble du compilateur Forge Web Script :** implémente le compilateur dans Forge Web
   Script utilisant uniquement le sous-ensemble accepté, enregistrements explicites pour l'état du compilateur,
   tampons d'octets/chaînes et importations de capacités déclarées. Sa sortie doit passer
   le TypeScript corpus de conformité octet par octet lorsque déterministe.
4. **Extension d'auto-hébergement :** ajoutez des agrégats, des boucles, une correspondance de modèles plus riches,
   assistants de diagnostic et compilation incrémentielle uniquement après que chaque fonctionnalité a été
   un appareil versionné et une histoire ABI compatible.

L'auto-hébergement est une étape ultérieure. Le compilateur bootstrap établit la sémantique
compatibilité ; ce n'est pas une promesse que la v1 elle-même puisse compiler une production
compilateur ou que les charges de travail Rust/AssemblyScript existantes seront réécrites.
