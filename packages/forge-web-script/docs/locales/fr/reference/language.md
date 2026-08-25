# Forger le script Web v1

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/forge-web-script/docs/reference/language.md: [packages/forge-web-script/docs/reference/language.md](../../../reference/language.md)
> Langue: Français (fr)

Forge Web Script (`.fws`) est un petit langage à usage général pour WebAssembly
charges de travail. Il est axé sur le Web, basé sur les fonctionnalités et délibérément indépendant de
Vue, React, le DOM et le compilateur de composants Forge. Ce document est le
contrat de langage et de module v1 faisant autorité. `@mission-platform/forge-web-script`
est la façade de compatibilité sécurisée pour le navigateur pour l'analyse, la vérification de type, le graphique/lien
résolution, données du manifeste et API du service de compilateur utilisées par l'adaptateur Vite
et LSP. `@mission-platform/forge-web-script-wasm` est le backend déterministe
qui abaisse l'IR vérifié à WebAssembly et WAT validés. Le Node uniquement
Le package `@mission-platform/forge-web-script-cli` fournit le package `forge-web-script`
commande pour vérifier et compiler des fichiers ou des graphiques sources. Le TypeScript
Le package contient également les appareils de conformité exécutables.

## Statut et versionnage

Le contrat actuel est **version linguistique `1.0`** et **version logique ABI
`1.2`**. La version linguistique décrit la source et la sémantique ; la version ABI
décrit la limite WebAssembly et le protocole hôte. Ils sont versionnés
indépendamment. Un compilateur doit écrire les deux versions dans chaque module généré
manifeste, et un chargeur doit valider les deux avant l’instanciation. ABI `1.2` est un
révision de rupture du contrat de mémoire : les manifestes `memory` doivent déclarer
`allocatorExport: "fws_alloc"`, `deallocatorExport: "fws_dealloc"` et
`reallocatorExport: "fws_realloc"`, tandis que `fws_reset` doit être présent dans le
ensemble d'exportation de modules. Les chargeurs rejettent les manifestes et modules plus anciens ou incomplets
plutôt que d'assumer silencieusement le réallocation manquant.

Le format source est du texte UTF-8 avec l'extension `.fws`. Un fichier source est un
module défini par fichier ; son identité est dérivée de l'ID de fichier Vite normalisé
(ou chemin relatif à l’espace de travail). L'entrée du compilateur identifie la version linguistique, tandis que l'entrée
Le manifeste généré est le marqueur de version persistant consommé par les chargeurs. Avenir
les révisions peuvent ajouter un pragma source, mais la v1 n'en nécessite pas ; un compilateur v1
doit rejeter une construction source qu'il ne comprend pas plutôt que de deviner son
version.

## Analyse des sources et politique de publication

Le package de base expose un contrat d'analyse pour le compilateur, le langage
intégrations de services, CLI et MCP. `analyzeForgeWebScript` accepte le coché
résultat du frontend et des règles enregistrées facultatives, puis renvoie les faits, les résultats et
les mêmes diagnostics stables utilisés par le reste du compilateur. Contexte d'analyse
comprend les fichiers source, les entrées facultatives de la carte source, l'IR brut et optimisé, le
Manifeste ABI, métadonnées de graphique/lien, le profil cible et la politique normalisée.

Les résultats de l'analyse utilisent des codes `FWS-ANALYSIS-*` stables et incluent une catégorie,
gravité, étendue des sources compatibles UTF-16, preuves, conseils de remédiation et
Références OWASP/CWE facultatives. Leurs diagnostics ajoutent `phase: "analysis"` et
métadonnées de sécurité sans modifier les `FWS-LEX-*`, `FWS-PARSE-*`,
Diagnostics `FWS-TYPE-*` ou `FWS-ABI-*`.

La compilation utilise le profil strict par défaut. En mode strict, gravité des erreurs
les résultats (ou les résultats explicitement marqués `blocking`) empêchent la sortie Wasm et ESM ;
le rapport complet reste disponible sur l'artefact restitué. Le développement
le profil est destiné aux workflows d'édition et d'investigation : il rapporte les résultats
mais ne les utilise pas comme porte de libération. La stratégie inclut une capacité explicite
liste verte et limites délimitées pour les résultats, la profondeur des appels, les boucles, les allocations, l'asynchrone
tâches et saisie d’expressions régulières.

Les clés de cache du service du compilateur incluent la politique d'analyse normalisée, enregistrée
les identifiants de règles et l'entrée de la carte source. Modification de l'une de ces entrées d'analyse
ne peut donc pas réutiliser un artefact produit dans le cadre d’une politique différente.

## Résultats sans exception et flux de contrôle structuré

Forge Web Script représente les résultats récupérables avec la bibliothèque standard
Énumérations `Option<T>` et `Result<T, E>`. Utilisez `match` pour gérer chaque variante ;
`throw`, `try` et `catch` au niveau source ne sont pas des constructions exécutables. Le
Les formulaires structurés `for`, `while` et `do while` sont un flux de contrôle exécutable v1 ;
ce ne sont pas des constructions d’exception ou d’itérateur. `Result` a exactement le
variantes `Ok(T)` et `Error(E)`.

Les fonctions itératrices utilisent `iter fn`, renvoient `Iterator<T>` et s'arrêtent à `yield` :

```fws
export iter fn forward(source: Iterator<i32>) -> Iterator<i32> {
  loop value = source.next() { yield value; }
}
```

Le compilateur expose une exportation d'itérateur via un outil compatible JavaScript
Adaptateur `next()`. Chaque appel renvoie `{ value, done: false }` pour une valeur et
`{ value: undefined, done: true }` à la fin ; les appels suivants restent
complet. `Iterator<T>.next()` est tapé comme `Option<T>`, donc les itérateurs sont chaînés
doit conserver le type d’élément et le contrat de propriété.

## Optimisation et profils cibles

L'optimisation des versions peut appliquer le déroulement d'itérateurs éprouvé, l'intégration d'appels purs,
analyse des appels de queue et pliage conditionnel sûr. Utilisez la directive `noinline`
lorsqu'une limite de fonction doit rester visible. Importations et journalisation des fonctionnalités
sont des effets secondaires observables et ne sont pas réordonnés. Les fonctionnalités cibles sont facultatives
compilez les entrées et sont enregistrées dans le manifeste ABI et la clé de cache :

```ts
const artifact = compileForgeWebScript({
  source,
  fileName: 'runtime.fws',
  compilerVersion: '1.0.0',
  optimization: 'release',
  targetFeatures: { simd: true, tailCall: true, memory64: true },
  compilerHints: { iteratorUnrollLimit: 4 },
});
```

`threads` et `atomics` doivent tous deux être activés pour la sortie atomique en mémoire partagée ;
les combinaisons non prises en charge produisent des diagnostics. Un manifeste Memory64 utilise `u64`
adresses et valeurs de longueur de pointeur-u64. En mode débogage, un cache configuré peut
persister déterministe `<key>.optimized.wat`, `<key>.unoptimized.wat`,
Artefacts `<key>.optimized.wasm` et `<key>.unoptimized.wasm`. Écritures en cache
sont additifs et indisponibles ou les caches défaillants n'échouent pas à la compilation.

## Profils de liens inter-projets

FWS prend en charge deux profils de liens principaux pour la gestion des dépendances entre projets :

- `linkProfile: "static"` : les modules inter-projets sont aplatis en un seul
  artefact graphique du scanner. Cela permet une optimisation statique agressive
  (profil `static-aggressive`) et élimine la recherche de module d'exécution au niveau
  coût de la taille de l’artefact.
- `linkProfile: "dynamic"` : les limites explicites du module source sont préservées.
  `ForgeWebScriptDynamicLinkCache` est utilisé pour résoudre les modules de décodeur au moment de l'exécution,
  avec des adresses de fonction mises en cache saisies par artefact et identité manifeste. Ceci
  utilise le profil d'optimisation `dynamic-conservative`, plus sûr pour
  distributions modulaires.

## Référence lexicale

La grammaire canonique enregistrée est
[`src/grammar/forge-web-script.ebnf`](../../../../src/grammar/forge-web-script.ebnf).
Les résumés lexicaux et analyseurs ci-dessous expliquent le contrat public v1 ; le
L'artefact EBNF fait autorité lorsqu'un détail d'implémentation est ambigu.

Les espaces sont insignifiants, sauf à l'intérieur des chaînes. `//` commence un commentaire qui
court jusqu'au bout de la ligne. `/*` démarre un commentaire de bloc qui se termine au prochain
`*/` ; les commentaires de blocage peuvent s'étendre sur plusieurs lignes. Les commentaires sont triviaux et n'entrent pas dans le
grammaire. Les identifiants commencent par `A-Z`, `a-z` ou `_`, et
continuez avec ces caractères ou chiffres décimaux. Les identifiants sont
sensible à la casse. Les littéraux entiers sont des séquences décimales non négatives ; la v1 le fait
n'accepte pas la syntaxe littérale hexadécimale, octale ou à virgule flottante dans le
sous-ensemble bootstrap. Les chaînes utilisent des guillemets doubles et uniquement des échappements compatibles JSON :
`\\`, `\"`, `\/`, `\b`, `\f`, `\n`, `\r`, `\t` et `\uXXXX` avec exactement
quatre chiffres hexadécimaux. Les terminateurs de ligne brute et les échappements invalides sont lexicaux
erreurs ; utilisez plutôt `\n` ou `\r`. Les valeurs de chaîne sont des valeurs UTF-8.

Les mots réservés sont `as`, `capability`, `case`, `catch`, `class`,
`constructor`, `default`, `do`, `else`, `enum`, `extends`, `export`, `for`,
`fn`, `if`, `impl`, `import`, `inline`, `interface`, `iter`, `let`, `likely`,
`loop`, `match`, `module`, `new`, `noinline`, `return`, `struct`, `switch`,
`throw`, `trait`, `try`, `unlikely`, `while` et `yield`. `true` et `false`
sont des littéraux booléens. La ponctuation est
`{ } ( ) [ ] : ; , | .` ; les opérateurs sont
`! % * + - / < <= == != > >= && || = -> => ::`.

Chaque étendue de diagnostic est une plage de décalage semi-open source `[start, end)` dans le
Chaîne originale UTF-16 TypeScript (les décalages comptent les unités de code UTF-16), avec
champs de ligne et de colonne à base unique. Le
L'implémentation du bootstrap rapporte les décalages et les données de ligne/colonne ensemble afin qu'un
L'adaptateur Vite peut produire des diagnostics mappés à la source sans analyse.

Le scanner conserve les commentaires sous forme de jetons `comment` afin que les commentaires de la documentation puissent
être attachés aux fonctions, tandis que les décisions de l'analyseur ignorent toutes les futilités. Opérateurs
avec des préfixes partagés sont sélectionnés par correspondance la plus longue. En cas de saisie mal formée, le
le scanner consomme une région délimitée, émet le diagnostic stable `FWS-LEX-*` et
continue vers un seul jeton EOF ; ce comportement de récupération fait partie de la grammaire
contrat. L'interface TypeScript mesure tous les décalages en unités de code UTF-16 ;
les étapes d'octets auto-hébergées doivent convertir les étendues d'octets UTF-8 avant de publier le
contrat de jeton partagé.

### Commentaires sur la documentation des fonctions

Un commentaire de bloc dont le délimiteur d'ouverture est `/**` est un commentaire de documentation.
Il est attaché à la prochaine déclaration `fn` ou `export fn` lorsque seulement
des espaces et des commentaires ordinaires apparaissent entre le commentaire et la déclaration :

```fws
/**
 * Adds one to a value.
 *
 * @param value The value to increment.
 * @return The incremented value.
 * @deprecated Use `increment` in new code.
 */
export fn add(value: i32) -> i32 {
  return value + 1;
}
```

Commentaires sur la documentation avant les importations de fonctionnalités, les importations de sources, les structures,
les énumérations, interfaces ou autres déclarations non fonctionnelles sont ignorées. Ils font
pas reporté à une fonction ultérieure. Si plusieurs commentaires de documentation apparaissent
avant une déclaration, le (dernier) commentaire de documentation le plus proche est utilisé ;
Les commentaires ordinaires `//` et `/* ... */` ne le remplacent pas. La documentation est
reconnu seulement au plus haut niveau; les commentaires à l'intérieur des corps de fonction ne sont pas
métadonnées de fonction. Un commentaire de bloc non terminé produit le lexical stable
Le diagnostic `FWS-LEX-003` et la récupération de l'analyseur restent disponibles pour le reste de
la source.

Les métadonnées AST normalisées ont cette forme :

```ts
interface ForgeWebScriptDocumentation {
  readonly description: string;
  readonly tags: readonly ForgeWebScriptDocumentationTag[];
}

interface ForgeWebScriptDocumentationTag {
  readonly name: string;
  readonly subject?: string;
  readonly text: string;
}
```

Le normalisateur supprime les délimiteurs `/**` et `*/`, les espaces de début, le
Décoration `*` facultative sur chaque ligne et espaces environnants. Fonctionne
d'espaces s'effondrent en un seul espace. Lignes de description avant la première balise
sont regroupés en paragraphes ; les lignes vides restent des sauts de paragraphe. Une balise commence
sur une ligne commençant par `@`, et les lignes suivantes non vides continuent le
balise précédente. L’ordre des balises et les balises en double sont conservés.

Les formes de balises couramment utilisées sont :

| Formulaire de balise                                    | Champs structurés                          |
| ------------------------------------------------------- | ------------------------------------------ |
| `@param name text`, `@arg`, `@argument` ou `@parameter` | `name` est `subject` ; le reste est `text` |
| `@typeparam name text`                                  | `name` est `subject` ; le reste est `text` |
| `@throws type text` ou `@exception type text`           | `type` est `subject` ; le reste est `text` |
| `@return text` ou `@returns text`                       | `text` uniquement                          |
| `@deprecated text`                                      | `text` uniquement                          |

Les autres formulaires `@name` sont acceptés et conservés sous forme de balises ordonnées plutôt que
signalé comme diagnostic. Ils n'ont pas de sujet déduit ; leur texte restant
est préservé. Les noms de balises sont sensibles à la casse.

Pour les consommateurs éditeurs, les mêmes métadonnées sont restituées de manière déterministe comme
description suivie de chaque balise dans l'ordre des sources, avec des lignes vides entre
pièces. Un sujet est émis entre le nom de la balise et son texte, par exemple :

```text
Adds one to a value.

@param value The value to increment.

@return The incremented value.

@deprecated Use `increment` in new code.
```

La documentation est constituée de métadonnées d'analyse, et non de sémantique de langage exécutable. Il se peut
être préservé dans l'AST et l'IR pour les consommateurs de services linguistiques, mais cela ne
affectent l'analyse des déclarations, la vérification du type, la réduction ou le comportement d'exécution.
La documentation est exclue des signatures et manifestes ABI, générés
déclarations et artefacts de chargeur, Wasm/WAT, hachages de contenu exécutable et
exigences de capacité. Changer uniquement un commentaire de documentation n'a donc pas d'effet
ne modifie pas l'ABI du module ou le contrat exécutable généré.

## Grammaire source

L'artefact EBNF enregistré lié ci-dessus décrit le lexical complet,
bootstrap, agrégat étendu et contrat de récupération. L'extrait suivant
décrit la surface d'amorçage v1 pour les lecteurs qui n'ont pas besoin du fichier complet.
La grammaire utilise `*` et `?` au sens habituel d'EBNF :

```ebnf
module       = { import | function } ;
import       = "import", "capability", string, "as", identifier,
               "(", [ parameters ], ")", "->", type, ";" ;
sourceImport = "import", string, "as", identifier, ";" ;
function     = [ "export" ], "fn", identifier, "(", [ parameters ], ")",
               "->", type, block ;
parameters   = parameter, { ",", parameter } ;
parameter    = identifier, ":", type ;
block        = "{", { statement }, "}" ;
statement    = "let", identifier, ":", type, "=", expression, ";"
             | "return", [ expression ], ";"
             | "if", expression, block, [ "else", block ]
             | "while", expression, block
             | "for", "(", [ for-clause ], ";", expression, ";",
               [ for-clause ], ")", block
             | "do", block, "while", expression, ";"
             | identifier, "=", expression, ";"
             | expression, ";" ;
for-clause   = "let", identifier, ":", type, "=", expression
             | identifier, "=", expression
             | expression ;
type         = "bool" | "bytes" | "f32" | "f64" | "i32" | "i64"
             | "string" | "u32" | "u64" | "unit" ;
expression   = literal | identifier | call | unary | binary ;
call         = identifier, "(", [ expression, { ",", expression } ], ")" ;
unary        = ( "!" | "-" ), expression ;
literal      = integer | string | "true" | "false" ;
```

Les opérateurs binaires suivent ces niveaux de priorité, du plus fort au plus faible :
`* / %`, `+ -`, comparaisons ordonnées, égalité, `&&` et `||`. Les opérateurs sont
associatif à gauche. Les expressions entre parenthèses sont réservées au prochain bootstrap
révision; un compilateur doit émettre un diagnostic d'analyse plutôt que silencieusement
les accepter aujourd'hui.

Cet extrait est la grammaire **bootstrap**. Il couvre les modules définis par fichier,
importations de capacités/sources, signatures primitives, appels, valeurs locales,
expressions, structurées `if`/`else`, `while`, `for` de style C, `do while` et
`return`. Les formulaires de boucle font partie du contrat d'amorçage exécutable ; seulement
les mots d'exception réservés `throw`, `try` et `catch` sont rejetés comme
constructions exécutables. Les déclarations et valeurs agrégées ci-dessous sont les
Contrat **prolongé** et ne doit pas être traité comme une orthographe alternative pour
la grammaire bootstrap.

### Grammaire globale étendue

Le contrat étendu ajoute des structures immuables, des énumérations balisées, des types génériques,
interfaces, valeurs de fonction, littéraux de collection, indexation et `match`.
Leurs principales formes de sources sont :

```ebnf
aggregate    = struct | enum | interface ;
struct       = "struct", identifier, [ generic_parameters ], "{",
               { identifier, ":", type, ";" }, "}" ;
enum         = [ "export" ], "enum", identifier, [ generic_parameters ], "{",
               variant, { ",", variant }, [ "," ], "}" ;
variant      = identifier, [ "(", [ parameters ], ")" ] ;
generic_parameters = "<", generic_parameter, { ",", generic_parameter }, ">" ;
generic_parameter  = identifier, [ ":", identifier ] ;
type         = primitive | identifier, [ "<", type, { ",", type }, ">" ]
             | "[", type, ";", integer, "]"
             | "Fn", "<", type, ",", type, ">" ;
constructor  = identifier, "::", identifier, "(", [ expression ], ")" ;
match        = "match", expression, "{", match_arm, { ",", match_arm }, "}" ;
match_arm    = pattern, "=>", expression ;
pattern      = "_" | identifier, [ "(", [ identifier, { ",", identifier } ], ")" ] ;
```

Constructeurs qualifiés tels que `Result::Ok(value)` et
`Result::Error(message)` résout l'agrégat et valide la variante
arité et types de champs. Les variantes standard `Result<T, E>` sont exactement
`Ok(T)` et `Error(E)` ; `Option<T>` reste `Some(T)` et `None`. Une fonction
la valeur utilise `fn name` et un type `Fn<parameter, result>` déclaré, par exemple
`let callback: Fn<i32, i32> = fn increment;`. Les valeurs des fonctions sont vérifiées par
la signature de fonction référencée et ne peuvent être appelées qu'avec une arité correspondante
et les types d'arguments.

Les liaisons de correspondance sont locales à leur bras : liaisons `Result::Ok(item) => item`
`item` en vérifiant uniquement cette expression. Les noms de liaison doivent être uniques dans un
les bras et leur nombre doivent correspondre aux champs de variantes sélectionnés ; ils ne fuient pas
aux bras des frères et sœurs ou à la fonction environnante.

## Types et sémantique

V1 a les types primitifs `bool`, signé `i32`/`i64`, non signé `u32`/`u64`,
`f32`/`f64`, `string`, `bytes` et `unit`. Il n'y a pas de chiffre implicite
conversions. Les opérandes arithmétiques doivent avoir le même type numérique ; comparaisons
produire `bool` ; les opérateurs logiques nécessitent `bool` ; l'égalité exige l'égalité
genres. Une fonction a un type de résultat déclaré et une fonction `unit` renvoie
sans valeur.

### Expressions régulières appartenant au compilateur

Forge Web Script fournit une bibliothèque standard d'expressions régulières déterministes.
Les appels `regex_full_match(pattern, value) -> bool`,
`regex_prefix_match(pattern, value) -> bool`, et
`regex_search(pattern, value, start: i32) -> bool` effectue une valeur entière,
préfixe de position zéro et correspondance de recherche la plus à gauche respectivement. Capturer les limites
sont disponibles via les `regex_*_capture_start` et
Appels `regex_*_capture_end` ; ils prennent un index de groupe et renvoient une chaîne UTF-16
offset, ou `-1` lorsqu'il n'y a pas de correspondance ou que le groupe n'est pas défini. Capture de recherche
les appels prennent en outre le décalage de départ avant l'index de groupe.

Les appels Regex sont des fonctions de bibliothèque standard appartenant au compilateur. Ils sont tapés par
le frontend, annoté en IR, et ne sont jamais des importations de capacités. Un module utilisant
seuls les appels regex ont donc un tableau `imports` vide et un vide
Tableau `requiredCapabilities`. La réduction du backend et la VM dans le module sont un
phase de mise en œuvre distincte ; un compilateur ne doit pas remplacer ces appels par un
navigateur `RegExp`, API Node ou importation d'hôte implicite.

La syntaxe prise en charge est intentionnellement limitée aux littéraux, `.`, caractère
classes et plages (y compris la négation `^`), `\d`, `\D`, `\w`, `\W`, `\s`,
`\S`, littéraux échappés, groupes capturants et non capturants, alternance,
`*`, `+`, `?`, `{n}` délimité, `{n,}`, quantificateurs `{n,m}`, quantificateurs paresseux,
et ancres `^`/`Forge Web Script fournit une bibliothèque standard d'expressions régulières déterministes.
Les appels`regex_full_match(pattern, value) -> bool`,
`regex_prefix_match(pattern, value) -> bool`, et
`regex_search(pattern, value, start: i32) -> bool`effectue une valeur entière,
préfixe de position zéro et correspondance de recherche la plus à gauche respectivement. Capturer les limites
sont disponibles via les`regex__*capture_start`et
Appels`regex*__capture_end` ; ils prennent un index de groupe et renvoient une chaîne UTF-16
offset, ou `-1` lorsqu'il n'y a pas de correspondance ou que le groupe n'est pas défini. Capture de recherche
les appels prennent en outre le décalage de départ avant l'index de groupe.

Les appels Regex sont des fonctions de bibliothèque standard appartenant au compilateur. Ils sont tapés par
le frontend, annoté en IR, et ne sont jamais des importations de capacités. Un module utilisant
seuls les appels regex ont donc un tableau `imports` vide et un vide
Tableau `requiredCapabilities`. La réduction du backend et la VM dans le module sont un
phase de mise en œuvre distincte ; un compilateur ne doit pas remplacer ces appels par un
navigateur `RegExp`, API Node ou importation d'hôte implicite.

La syntaxe prise en charge est intentionnellement limitée aux littéraux, `.`, caractère
classes et plages (y compris la négation `^`), `\d`, `\D`, `\w`, `\W`, `\s`,
`\S`, littéraux échappés, groupes capturants et non capturants, alternance,
`*`, `+`, `?`, `{n}` délimité, `{n,}`, quantificateurs `{n,m}`, quantificateurs paresseux,
et ancres `^`/. Références arrière, recherche, groupes nommés, indicateurs et
les autres extensions du moteur hôte sont rejetées. La syntaxe non prise en charge a la version stable
Diagnostic `FWS-REGEX-001` ; les modèles mal formés utilisent `FWS-REGEX-002` et un
L'échec invariant du compilateur interne utilise `FWS-REGEX-003`.

Le package partagé `@mission-platform/forge-web-script-regex` possède la stable `$`
bytecode (`FORGE_REGEX_BYTECODE_VERSION`) et compilateur au moment de la construction. C'est explicite
Le point d'entrée `/reference` expose une VM TypeScript uniquement en tant qu'oracle de conformité
pour les tests différentiels de moteurs natifs et back-end ; la racine du paquet ne le fait pas
exposer cette VM. Les métadonnées spécifiques au téléphone restent dans le package de numéros de téléphone.
L'exécution des expressions régulières de production appartient au backend Forge Web Script et au
module WASM généré, jamais vers une couche d'exécution TypeScript ou une capacité hôte.

`string` et `bytes` sont les valeurs globales v1. Une chaîne est un immuable
séquence de valeurs scalaires Unicode représentées sous forme UTF-8 à la limite ABI.
Les octets sont une séquence d'octets immuable et peuvent contenir n'importe quelle valeur de
`0x00` à `0xff`. Leurs opérations au niveau de la source sont intentionnellement petites
dans le sous-ensemble bootstrap ; les appels d'hôte et les modules de bibliothèque standard ultérieurs fournissent
opérations d'encodage, de découpage et de collecte sans ajouter de navigateur ambiant
API du langage.

### Signatures de collecte

Le contrat de collecte étendu est structurel et basé sur le séquestre ; ça fait
n'ajoutez pas de méthodes d'objet arbitraires. Les tableaux fixes sont écrits `[T; N]` et
vecteurs comme `Vector<T>`. Les signatures prises en charge sont :

| Récepteur   | Méthode         | Signature               |
| ----------- | --------------- | ----------------------- |
| `Array<T>`  | `length`        | `() -> u32`             |
| `Array<T>`  | `get`           | `(u32) -> Option<T>`    |
| `Array<T>`  | `set`           | `(u32, T) -> Array<T>`  |
| `Array<T>`  | `iter`          | `() -> Iterator<T>`     |
| `Vector<T>` | `length`        | `() -> u32`             |
| `Vector<T>` | `get`           | `(u32) -> Option<T>`    |
| `Vector<T>` | `set`           | `(u32, T) -> Vector<T>` |
| `Vector<T>` | `push` ou `add` | `(T) -> Vector<T>`      |
| `Vector<T>` | `pop`           | `() -> Option<T>`       |
| `Vector<T>` | `iter`          | `() -> Iterator<T>`     |

L'orthographe `add` est intentionnellement un alias de compatibilité pour le vecteur
`push` ; ce n'est pas une méthode tableau. Les index sont `u32`, les arguments des éléments doivent
correspond à `T` et les valeurs de retour doivent correspondre aux signatures ci-dessus. Mauvaise arité,
les types d'arguments, les types de récepteurs et les méthodes inconnues sont des erreurs de vérification de type.
Les littéraux vides nécessitent un type d'élément contextuel, tandis que les tableaux/vecteurs non vides
les littéraux déduisent leur type d'élément de manière récursive et rejettent les éléments mixtes. Un
Le littéral de tableau fixe doit contenir exactement les éléments `N`.

Les éléments locaux sont limités à une fonction, initialisés exactement une fois et ne peuvent pas être lus avant
leur déclaration. Une déclaration locale ne masque aucun nom existant : dupliquer
les noms sont une erreur. Les fonctions et les alias de capacités partagent un espace de noms de module
et doit être unique. Un appel doit nommer une fonction déclarée ou importée
capacité, et ses types d’arité et d’argument doivent correspondre exactement.

La surface de flux de contrôle v1 est structurée `if`/`else`, `while`, `for` de style C,
`do while` et `return` précoce. Les clauses `for` sont des instructions explicites et ne
ne pas introduire de classes, de récepteurs ou de mutations implicites en dehors de la boucle
environnement de valeur locale. Il n’y a pas de résultat implicite : chaque
Le chemin accessible dans une fonction non-`unit` doit renvoyer le type déclaré. Le
le vérificateur d'amorçage rapporte des erreurs de type renvoyées ; l'analyse d'accessibilité est un
suivi requis avant de déclarer un compilateur entièrement conforme à la v1.

FWS est intentionnellement sans classe. `class`, `constructor`, `extends`, `impl`,
`new` et `trait` sont réservés et rejetés avec un diagnostic stable
`FWS-PARSE-052` ; structures immuables, énumérations balisées, interfaces et fonctions
les valeurs sont les alternatives orientées valeur prises en charge. L’auto-hébergement par étapes
Le contrat conserve le compilateur TypeScript enregistré comme graine pendant que le compilateur FWS
et les contrats d'exécution sont démarrés progressivement.

## Modules définis par fichier, importations de sources et exportations

Il n’existe pas de déclaration `module` imbriquée. Chaque fichier `.fws` est un module et son
Le nom stable est dérivé de son ID de fichier normalisé. Par exemple,
`src/time.fws` dans le projet `/workspace/app` a l'ID de module `src/time`. Imbriqué
La syntaxe `module name { ... }` est rejetée avec un diagnostic de migration.

Les importations de modules source sont distinctes des importations de capacités hôtes :

```fws
import "./math.fws" as math;
import capability "clock.now" as now() -> i64;
```

L'adaptateur Vite résout les importations de source via son graphique de module. Dépendances
à l'intérieur d'un projet sont liés statiquement par défaut. Bords inter-projets par défaut
au chargement dynamique et peut être configuré comme `static` ou `dynamic` avec explicite
configuration du lien racine du projet. Modules manquants, cycles non pris en charge par le
le mode de liaison sélectionné et les collisions d'identité sont des diagnostics graphiques.

Les liens statiques aplatissent les exportations d’invités accessibles en un seul artefact. Collisions d'exportation
sont rejetés de manière déterministe (`FWS-LINK-003` pour les signatures en double et
`FWS-LINK-004` pour les signatures incompatibles) ; l'éditeur de liens ne le fait pas silencieusement
espace de noms ou écraser les fonctions invitées. Les liens dynamiques restent un module séparé
limites et sont enregistrés en tant qu'importations de module source dans le manifeste ABI, jamais
que les capacités de l'hôte ambiant.

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
`clock.now`, `random.bytes` ou `storage.read`. Les noms de capacités appartiennent à
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
interruption `CapabilityDenied` au moment du chargement ; ils ne deviennent pas `undefined` ou un
silence, non-opération.

## Valeurs, mémoire linéaire et propriété

Le module utilise une mémoire linéaire WebAssembly avec des pages de 64 Ko et un format Little-Endian
valeurs scalaires. Les valeurs scalaires sont mappées comme suit :

| Forger un script Web | Représentation WebAssembly                            |
| -------------------- | ----------------------------------------------------- |
| `bool`               | `i32`, où `0` est faux et `1` est vrai                |
| `i32`, `u32`         | `i32`                                                 |
| `i64`, `u64`         | `i64`                                                 |
| `f32`, `f64`         | flottant WebAssembly correspondant                    |
| `unit`               | aucune valeur de résultat                             |
| `string`, `bytes`    | deux valeurs `u32` : pointeur puis longueur en octets |

Le manifeste déclare le même mappage dans `valueRepresentations`. Un
La paire de longueur de pointeur est toujours vérifiée en tant que plage non signée avant la lecture ou
écriture : `pointer <= memory.byteLength` et `length <= byteLength - pointer`.
La longueur nulle est valide et peut utiliser n'importe quel pointeur entrant, y compris la fin de
mémoire. Une vérification échouée intercepte `MemoryOutOfBounds` et n'expose jamais un
valeur partiellement décodée.

Le module généré exporte `fws_alloc(size: u32) -> u32`,
`fws_dealloc(pointer: u32, size: u32) -> unit`, et
`fws_realloc(pointer: u32, oldSize: u32, newSize: u32) -> u32` comme propriété
limite pour les tampons. En sténographie de signature, l'opération est
`fws_realloc(pointer, oldSize, newSize) -> pointer`. L'appelant qui alloue un tampon en est propriétaire et doit
désaffectez-le ou réaffectez-le en utilisant le même module et sa taille actuelle exacte.
Le réallocateur préfère redimensionner l'allocation actuelle de crue en place,
y compris la diminution et la croissance lorsque la mémoire linéaire peut croître. Sinon, c'est
alloue un remplacement, copie exactement `min(oldSize, newSize)` octets et
libère l'ancienne allocation avant de renvoyer le pointeur de remplacement. Un
le résultat de taille nulle est valide et une requête de taille égale renvoie l'original
pointeur. Les implémentations hôtes doivent copier les octets d'entrée avant l'appel de l'invité
renvoie sauf si le manifeste introduit explicitement un futur tampon emprunté
contracter. Le code invité ne doit pas conserver un pointeur appartenant à l'hôte après un appel de l'hôte.
Pièges d’échec d’allocation ou de croissance avec `MemoryExhausted` ; un pointeur invalide ou
pièges de taille avec `MemoryOutOfBounds` ; et un pointeur obsolète, incorrect
`oldSize`, interruptions libres doubles ou non valides avec `InvalidOwnership`. Ces
les contrôles ont lieu avant la mutation, et une réallocation échouée laisse l'original
allocation et octets inchangés.

Les exceptions d'hôte sont converties en `HostError` avec le nom de la fonctionnalité et un
code d'erreur hôte opaque. Les pièges à invités ne sont jamais convertis en retour ordinaire
valeurs. Les hôtes peuvent enregistrer les détails des pièges, mais ils ne doivent pas divulguer de secrets ou de données brutes.
exceptions du navigateur au code invité non fiable.

### Opérations de mémoire vérifiées appartenant aux invités

Les modules source FWS qui implémentent un tas invité avec état peuvent utiliser le composant appartenant au compilateur.
opérations `memory_alloc(size: u32) -> u32`,
`memory_dealloc(pointer: u32, size: u32) -> unit`,
`memory_realloc(pointer: u32, oldSize: u32, newSize: u32) -> u32`,
`memory_load_u32(address: u32) -> u32`, et
`memory_store_u32(address: u32, value: u32) -> unit`. Ces opérations sont
abaissé directement sur l'allocateur de module ou vérifié la mémoire WebAssembly
instructions ; ils ne sont pas des importations d'hôtes et n'exposent pas l'état invité à
TypeScript.

L'allocateur utilise le même contrat de propriété et d'interruption que `fws_alloc` et
`fws_realloc`. Un chargement ou un stockage nécessite une plage complète de quatre octets dans le
mémoire linéaire actuelle ; une plage non valide intercepte avec `MemoryOutOfBounds` avant
l'opération peut être partiellement exécutée. `memory_realloc` conserve le premier
`min(oldSize, newSize)` octets et renvoie un pointeur appartenant à l'invité, tandis que les appelants
doit utiliser le pointeur renvoyé et sa taille actuelle exacte pour les opérations ultérieures.
Le dispositif de mémoire avec état sous
`packages/forge-web-script/src/fixtures/stateful-memory.fws` est la conformité
dispositif pour ces signatures, réutilisation de l'allocateur, récursivité, réinitialisation et limites
pièges.

Les lecteurs d'octets appartenant au compilateur fournissent également des variantes d'index non signées pour les invités.
frontaux qui représentent les décalages de source sous forme de handles : `bytes_length_u32(value :
octets) -> u32` and `bytes_byte_at_u32(valeur : octets, index : u32) -> u32`. Ils
utilisez les mêmes vérifications de limites de longueur de pointeur que le `bytes_length` signé et
`bytes_byte_at` et ne sont pas des importations d'hôtes. Le frontal WebLua utilise
ces opérations pour conserver les décalages lexer et les adresses de mémoire invité en un seul
domaine `u32` vérifié.

### WASM ABI brut et contrat ESM généré

La représentation ci-dessus est le WASM ABI brut stable. C'est intentionnellement
bas niveau et ne change pas lorsque la façade JavaScript générée devient plus
ergonomique :

```text
raw string value: (pointer: u32, length: u32)
raw bytes value:  (pointer: u32, length: u32)
```

L'artefact ESM généré par le compilateur projette cet ABI dans une API JavaScript :

```ts
type ForgeWebScriptBytes = readonly [pointer: number, length: number];

interface ForgeWebScriptExports {
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: (size: number) => number;
  readonly fws_dealloc: (pointer: number, size: number) => void;
  readonly fws_realloc: (pointer: number, oldSize: number, newSize: number) => number;
  readonly fws_reset: () => void;
  readonly echo: (value: string) => string;
  readonly processBytes: (value: ForgeWebScriptBytes) => ForgeWebScriptBytes;
}
```

Chaque déclaration générée, y compris les importations de capacités et les liens dynamiques
exporte, utilise `string` pour les valeurs FWS `string`. Les `load` et
Les wrappers `loadSync` codent les chaînes JavaScript au format UTF-8 et transmettent la longueur du pointeur
s'associe au WASM ABI inchangé et décode les chaînes renvoyées en JavaScript
cordes. Le décodage utilise un décodeur UTF-8 fatal : les octets invités mal formés sont un
erreur de limite explicite plutôt que des caractères de remplacement.

Les arguments de chaîne pour un appel sont d'abord codés et regroupés en un seul
répartition des invités. Cela maintient l'ABI brut inchangé tout en évitant un invité
allocation et copie JavaScript vers WASM par argument. Les arguments scalaires sont conservés
leur chemin direct et rapide. `bytes` n'est volontairement pas converti en `Uint8Array` :
les appelants continuent de transmettre et de recevoir `ForgeWebScriptBytes`, et `memory` est
exposé afin que les appelants puissent lire ou écrire des plages d'octets bruts en utilisant la mémoire du module
et les règles de propriété.

L'adaptateur généré possède des tampons temporaires créés pour les arguments de chaîne et
résultats de chaîne. Il décode un résultat avant de le publier, puis libère chacun
plage temporaire exactement une fois dans un chemin `finally` en cas de succès, pièges invités, hôte
exceptions et échecs de décodage. Une capacité hôte avec des valeurs de chaîne reçoit
Chaînes JavaScript et peut renvoyer une chaîne JavaScript ; l'emballage effectue le
allocation d'invité et copie UTF-8 pour cette valeur de retour. Le code hôte doit toujours être copié
entrées brutes `bytes` avant de revenir, sauf si un futur manifeste le déclare explicitement
un contrat tampon emprunté. `load` et `loadSync` exposent les mêmes éléments générés
contrat; ils diffèrent uniquement par la planification de l'initialisation des modules.

La modification de cette projection JavaScript ne modifie pas `valueRepresentations`, le
ABI brut de longueur de pointeur, la version ABI ou le hachage brut du contenu WASM.
L'artefact généré conserve une représentation WASM intégrée décodée paresseusement ;
`load` et `loadSync` le partagent plutôt que de matérialiser une charge utile distincte
copies. Par conséquent, les vérifications du chargeur asynchrone contre synchronisation doivent comparer le comportement
et les déclarations, tandis que les contrôles déterministes de hachage de contenu devraient hacher le contenu brut
Octets WASM indépendamment de la taille de la source ESM générée ou de l'implémentation du chargeur
détails.

## Format du manifeste

Chaque module généré possède un manifeste ABI stable compatible JSON avec son
Artefact WASM et chargeur ESM typé :

```json
{
  "format": "forge-web-script-module",
  "languageVersion": "1.0",
  "abiVersion": "1.2",
  "moduleName": "src/clocked",
  "exports": [{ "name": "current_time", "parameters": [], "result": "i64" }],
  "imports": [
    {
      "capability": "clock.now",
      "alias": "now",
      "function": { "name": "now", "parameters": [], "result": "i64" }
    }
  ],
  "sourceImports": [],
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
  "trapModel": "explicit-trap",
  "standardLibrary": { "regexBytecodeVersion": "bytecode-1" }
}
```

Le manifeste réel contient toutes les entrées de représentation primitive, non seulement
ceux utilisés dans l'exemple. Les clés JSON pour les exportations, les importations et les fonctionnalités sont
stable lors de builds répétés ; les cartes sources et les hachages de contenu sont émis par
l'adaptateur du compilateur et ne font pas partie de la correspondance de signature ABI.

Le champ manifeste `standardLibrary` enregistre les identités des bibliothèques appartenant au compilateur.
Pour les expressions régulières, `regexBytecodeVersion` et un `regexCorpusHash` facultatif sont en cache
et les entrées d’artefacts. La source normalisée, la version du compilateur, l'optimisation
mode, graphique de module, configuration des liens, identité de bibliothèque standard et métadonnées
Le hachage du corpus doit être sérialisé dans un ordre stable avant la recherche du cache. Identique
les entrées produisent des tables de bytecode, des manifestes, des déclarations, des WAT et des
hachages de contenu ; changer toute entrée d'identité est un manque de cache. Un hachage de corpus est
appartient au package fournissant le corpus et ne doit pas être déduit de l'hôte
état d'exécution.

## Limites du compilateur et de la CLI

La façade publique TypeScript sépare les contrats frontaux et l'orchestration.
de l’émission. Il accepte un fichier source ou un graphique résolu, produit des
diagnostics plus IR tapé, et délègue la génération WebAssembly/WAT à
`@mission-platform/forge-web-script-wasm`. Le backend valide ses octets avant
les retourner ; les erreurs suppriment la sortie exécutable. L'adaptateur Vite et l'utilisation de LSP
la façade et n'ont pas besoin de dépendre de la CLI Node.

Pour les workflows du système de fichiers, installez `@mission-platform/forge-web-script-cli` et
utilisez son binaire autonome `forge-web-script` :

```text
forge-web-script check <entry.fws> [--root <directory>] [--project-root <directory>]
forge-web-script compile <entry.fws> --out-dir <directory>
  [--root <directory>] [--project-root <directory>]
  [--link-mode static|dynamic] [--capability <name>] [--optimization debug|release]
```

`check` valide les entrées source et graphique sans écrire de fichiers. Un succès
`compile` écrit exactement `<entry>.wasm`, `<entry>.wat`, `<entry>.abi.json`,
`<entry>.d.ts`, `<entry>.js` et `<entry>.map` vers le répertoire de sortie sélectionné.
La CLI organise et renomme l'ensemble complet uniquement une fois les diagnostics clairs.
source mal formée, bords de graphique non résolus, capacités refusées et erreurs ABI
ne laisse aucun artefact exécutable et renvoie un statut non nul. Commande de sortie,
manifeste JSON, WAT, déclarations, données du chargeur, cartes sources et hachages de contenu
sont déterministes pour des entrées identiques.

## Intégration des tests Vitest et Vite

Utilisez `@mission-platform/forge-web-script-vitest` lorsqu'une suite Vitest doit
affirmer les artefacts du compilateur, les diagnostics structurés, le comportement Wasm, les liens graphiques,
ou le contrat de module Vite généré. Ses méthodes d'exploitation directe (`compile`,
`compileSource`, `compileGraph`, `inspect`, `load`, `loadSync` et
`checkVmParity`) déléguer au public les contrats compilateur/runtime ; c'est
L'assistant `defineForgeWebScriptVitestConfig` installe la production
`forgeWebScriptPlugin` tout en préservant les plugins et paramètres grand public Vite.
Voir [Tests dans Mission Platform](../../../../../../docs/locales/fr/testing.md#forge-web-script-tests) pour
exemples de configuration et de luminaires.

Le harnais accepte les fonctions hôtes uniquement via des cartes de capacités explicites saisies
par noms de capacités manifestes, par exemple :

```ts
const exports = await harness.load<{ current: () => bigint }>('capabilities/clock-now.fws', {
  'clock.now': { now: () => 123n },
});
```

Les importations déclarées manquantes et les importations non déclarées sont des échecs. Tester
les projets qui importent `.fws` ou ses requêtes d'artefacts virtuels doivent ajouter le
sous-chemin de déclaration de type uniquement
`@mission-platform/forge-web-script-vitest/forge-web-script` à leur
TypeScript Liste `types` ou point d'entrée de type de test référencé.

Les luminaires de harnais partagés sous
`packages/forge-web-script-vitest/fixtures/` est le corpus multi-package pour
modules, diagnostics, capacités, graphiques et parité auto-hébergés valides.
Les appareils locaux du package restent appropriés pour le compilateur, le runtime et le plugin
tests qui exercent des détails privés.

`checkVmParity` signale le contrat de parité lex-stage auto-hébergé limité dans
Mode `interpret`, `jit` ou `aot`. Affirmer la parité, les empreintes digitales, le nombre de pas,
et les métadonnées de reproductibilité AOT, mais ne traitez pas ce rapport comme arbitraire
Exécution de VM FWS compilées ; Le chargement de Wasm reste la vérification du comportement d'exécution.

## Diagnostic

Les diagnostics sont des enregistrements structurés avec `code`, `severity`, `phase`, `message`,
`fileName`, et une source `span` ; les enregistrements exploitables peuvent également inclure `hint`.
La phase est l'une des phases `lex`, `parse`, `type-check` ou `abi`. Code v1 stable
les familles comprennent:

| Famille de codes | Signification                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `FWS-LEX-*`      | caractères/échappements non valides, terminateurs de ligne de chaîne brute ou chaînes/commentaires non terminés |
| `FWS-PARSE-*`    | syntaxe de module, de déclaration, d'instruction ou d'expression non valide                                     |
| `FWS-TYPE-*`     | type primitif, nom, opérateur, argument ou retour non valide                                                    |
| `FWS-ABI-*`      | noms en double, capacités refusées, exportations ou importations                                                |
| `FWS-REGEX-*`    | modèles d'expressions régulières appartenant au compilateur non pris en charge ou mal formés                    |

Les erreurs empêchent la génération d’artefacts. Les avertissements et les diagnostics informatifs
ne change pas la sémantique. L'ordre des diagnostics est l'ordre des sources, suivi de la phase
commande de diagnostics attachés à la même travée. Un adaptateur Vite doit préserver
le code stable et le span lors du transfert d'une erreur à Vite.

## Contrat de conformité Bootstrap

La cible du compilateur v1 est intentionnellement limitée au langage et à la surface ABI
documenté ici. Un programme est dans le sous-ensemble bootstrap s'il en utilise un
module, les règles lexicales ci-dessus, les types primitifs, les valeurs `string`/`bytes`,
fonctions explicitement exportées, importations de capacités, déclarations locales, appels,
expressions, `if`/`else`, `while`, `for` de style C, `do while` et `return`.
Le contrat de granulats étendu est testé séparément et ajoute
structures, énumérations, types génériques, valeurs de collection, valeurs de fonction et
`match` ; il ne doit pas dépendre d'un navigateur implicite ou global Node.

`packages/forge-web-script/src/fixtures/bootstrap.ts` est l'exécutable
corpus de conformité. Les appareils acceptés doivent être validés sans diagnostic d'erreur ;
les appareils rejetés doivent signaler leurs codes de diagnostic stables répertoriés et valides
étendues de source. Les implémentations dans d'autres langages peuvent consommer le même appareil
façonner et comparer les AST normalisés, les diagnostics et le manifeste JSON. Le luminaire
suite est une cible de conformité, et non un instantané spécifique à l'implémentation.

Le corpus source partagé dans
`packages/forge-web-script-vitest/fixtures` couvre la même limite :
`valid/collections.fws` exerce les littéraux de collection, l'indexation, le contexte
vecteurs vides, `length()` et chaînes d'échappement valides ;
`valid/aggregates.fws` exerce des valeurs de fonction, qualifiées `Result::Ok` et
Constructeurs `Result::Error` et liaisons de correspondance arm-locales ; et
`diagnostics/collections.fws` exerce des appels de collecte et un agrégat non valides
diagnostics constructeur/liaison. Le luminaire de collection est également compilé
via le harnais Wasm partagé ; la syntaxe globale est conservée comme interface
source de conformité jusqu'à ce que la réduction globale du Wasm soit activée pour ce harnais.

## Politique de compatibilité

Les versions majeures de langue et d'ABI sont incompatibles par défaut. Un chargeur peut accepter
le même ABI majeur avec une version mineure supérieure uniquement lorsque le producteur marque le
les nouveaux champs sont facultatifs et le consommateur ignore les champs inconnus en toute sécurité. Supprimer un
exporter, modifier un type, changer de propriétaire ou modifier une capacité
la signature nécessite une révision ABI de rupture et doit être rejetée par les chargeurs qui
ne le mettez pas en œuvre. ABI `1.2` est une révision tellement révolutionnaire malgré le maintien
la numérotation `1.x` : son export mémoire `fws_realloc` requis n'est pas optionnel,
et les manifestes ABI `1.1` ne sont pas mis à niveau silencieusement. Jamais ajouter une fonctionnalité
modifie silencieusement un module existant : cela nécessite une nouvelle déclaration manifeste et
approbation de l’hôte.

Les versions du compilateur ne sont pas des versions ABI. Les compilateurs doivent inclure leur version dans
l'entrée de compilation et le hachage de l'artefact, mais les chargeurs comparent le langage et l'ABI
versions plus la signature manifeste. Un échec de la vérification de compatibilité est un
diagnostic au moment du chargement, pas une solution de secours à l'exécution. Modules Rust et AssemblyScript
continuer à utiliser leurs wrappers existants et leurs contrats ABI pendant la coexistence
période; Forge Web Script ne les réinterprète ni ne les remplace.

La compatibilité de la bibliothèque standard Regex est intentionnellement séparée de l'expression régulière hôte
compatibilité. Le contrat de bytecode Forge et le compilateur définissent les valeurs acceptées.
syntaxe et diagnostics stables ; la VM de référence sert uniquement à valider le
comportement le plus à gauche/retour en arrière, décalages de capture UTF-16 et sentinelle non définie `-1`
jusqu'à ce que la VM backend soit disponible. Comportement du navigateur ou de l'expression régulière Node
n'est qu'un oracle différentiel, et ni la VM de référence TypeScript ni un
L'API d'expression régulière hôte peut exécuter un appel à la bibliothèque standard de production.
Modification de la numérotation des opcodes, disposition des emplacements de capture, syntaxe prise en charge, diagnostic
codes, ou la sémantique correspondante nécessite une nouvelle version du bytecode regex et un nouveau
l'identité de l'artefact. Jusqu'à la conformité du backend/runtime et la migration des numéros de téléphone
les preuves sont complètes, l'implémentation du téléphone AssemblyScript reste un
Oracle de régression hérité explicite et n'est jamais mélangé avec un artefact Forge.

## Coexistence et migration

Forge Web Script est la cible de production pour le neutre
Artefact `@mission-platform/code-scanner`. Son graphique de scanner relie statiquement
les sources du décodeur QR, matriciel et code-barres dans un WebAssembly autonome
artefact ; le profil dynamique maintient ces limites source-module explicites et
met en cache les exportations résolues. La caisse Rust `code-scan` reste disponible en
implémentation native/de référence et n'est pas une dépendance d'exécution du package.
Les packages publics QR, Matrix et Barcode conservent leurs propres wrappers typés ;
ces API ne sont pas redirigées silencieusement via le graphique du scanner.

Le `codecMigrationFixture` dans
`packages/forge-web-script/src/fixtures/codec-migration.ts` est le premier
dispositif de conformité en forme d'adaptateur de codec. Il déclare
`codec.barcode.encode(payload: string) -> bytes`, exporte `encode_payload`, valide le
ABI de longueur de pointeur et utilise un hôte injectable pour écrire la sortie appartenant à l'appelant.
Cela reste intentionnellement un élément ABI étroit : l'hôte peut utiliser une méthode déterministe
faux pour les tests de conformité pendant que l'appareil prouve le script Web Forge
frontière. La parité des codecs de production nécessite toujours des vecteurs correspondants et
des mesures de performances, pas seulement un nom de fonction correspondant.

Le wrapper hérité correspondant exporte `encode(symbology, data)` et renvoie
`Uint8Array | undefined` ; le luminaire exporte `encode_payload(payload)` et
renvoie une paire `bytes` appartenant à ABI. Cette différence délibérée maintient le
limite de capacité explicite : un adaptateur de migration peut mapper l'héritage
la symbologie/les données appellent la capacité déclarée, mais l'appareil ne le fait pas
prétendre que les deux exportations sont encore comportementalement interchangeables.

### Sélection d'une implémentation

| Charge de travail ou exigence                                                              | Sélectionnez                                                           | Raison                                                                                                                            |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Comportement du package QR ou matriciel existant                                           | `@mission-platform/qr-code` / `@mission-platform/matrix-code`          | Les wrappers ESM typés spécifiques au package restent disponibles pour ces API publiques.                                         |
| Comportement neutre du scanner d'image et de caméra                                        | `@mission-platform/code-scanner`                                       | Utilise par défaut un graphique FWS lié statiquement ou un profil de module source dynamique explicite avec répartition en cache. |
| Comportement des codes-barres existants                                                    | `@mission-platform/barcode`                                            | Les graphiques Forge Web Script locaux du package fournissent la façade de code-barres tapée.                                     |
| Nouveau calcul à usage général sécurisé pour les navigateurs avec effets d'hôte explicites | Forge Web Script plus `@mission-platform/vite-plugin-forge-web-script` | Source `.fws` versionnée, manifeste, chargeur typé et fonctionnalités de refus par défaut.                                        |
| Source AssemblyScript existante ou migration spécifique à AssemblyScript                   | `@mission-platform/vite-plugin-assemblyscript`                         | Compile les entrées AssemblyScript `.ts` et conserve son contrat d'exportation brute généré.                                      |
| Compilation d'interface utilisateur/composant indépendante du framework                    | Compilateur de composants Forge                                        | Forge Web Script ne remplace pas `FrameworkOutputPlugin` ou les cibles de composants.                                             |

Utilisez le plugin Forge Web Script Vite uniquement pour les entrées `.fws`. Utilisez le
Plugin AssemblyScript pour les entrées AssemblyScript existantes. Lors de la migration, un
l'application peut regrouper les deux types de modules : chaque chargeur possède le sien
l'initialisation, la mémoire et la validation ABI, ainsi que les importations de fonctionnalités doivent être
fourni explicitement aux modules Forge Web Script.

### Porte de preuve et de dépréciation

Le travail de migration doit enregistrer quatre comparaisons indépendantes pour chaque candidat :

1. comportement exporté par rapport aux vecteurs dorés partagés, y compris les entrées invalides et
   cas limites ;
2. Sécurité ABI, y compris vérifications de manifeste/version, refus d'importation, vérifications de limites,
   conversion de piège et propriété du tampon ;
3. stabilité des artefacts générés, y compris les hachages reproductibles, les déclarations,
   cartes sources et chargement du navigateur/Node ; et
4. une mesure représentative des performances de version-build couvrant la compilation
   le temps, la taille de l'artefact, l'initialisation et les appels en régime permanent.

Le dispositif de migration fournit actuellement les parties ABI et artefact de ce
des preuves. Les tests existants sur les emballages de codes-barres et les packages de décodeurs restent les
Oracle sur le comportement et la régression héritée ; placez-les plutôt à côté du luminaire
que de traiter le luminaire comme une référence de remplacement. Forger la toile
Le script ne doit pas rendre obsolète un chemin Rust ou AssemblyScript jusqu'à ce qu'une charge de travail soit réussie
les quatre comparaisons dans deux environnements hôtes pris en charge, ont un document
chemin de restauration et n'a aucun résultat ABI ou de sécurité non résolu. Dépréciation alors
nécessite une fenêtre de compatibilité annoncée et un adaptateur ou un guide de migration ;
la suppression nécessite une version majeure ultérieure.

## Contrats d'agrégation et d'exécution sans classe

Le contrat étendu sans classe ajoute des valeurs `struct` immuables, étiquetées `enum`.
valeurs, déclarations structurelles `interface` au moment de la compilation, paramètres génériques
avec les limites de l'interface, les valeurs de fonction, les littéraux/méthodes de collection et
`match` expressions/instructions. Les constructeurs d'énumérations qualifiés utilisent `Type::Variant`
et les liaisons de match sont locales au bras ; par exemple,
`Result::Ok(item) => item` lie `item` uniquement dans ce bras. La norme
Le contrat `Result<T, E>` utilise `Ok(T)` et `Error(E)`, et non `Err(E)`.
Les mises à jour de structure sont de pures transformations de valeur ; ni structures ni interfaces
avoir des constructeurs, une identité, un héritage, des récepteurs ou une répartition d'exécution. N'importe lequel
tenter de déclarer des constructions orientées classe/objet (y compris `class`,
`constructor`, `extends`, `impl`, `new` et `trait`) est rejeté avec un code stable
diagnostic `FWS-PARSE-052`.

Les dispositions agrégées sont enregistrées dans le manifeste dans l’ordre canonique des noms. Structure
les champs sont des valeurs ordonnées et alignées sur quatre octets ; les dispositions d'énumération commencent par un caractère de quatre octets
discriminant. La propriété du champ est explicite (`owned`, `borrowed` ou `shared`) et
par défaut, il s'agit d'un stockage immuable détenu. Les valeurs génériques sont spécialisées par béton
tapez ; les représentations basées sur des descripteurs sont réservées aux itérateurs explicites ou
les limites de l’interface et sont représentées par des enregistrements de spécialisation.

Le contrat de bytecode de la VM est indépendant du backend. Un `ForgeWebScriptVmModule`
contient des fonctions typées, des constantes, des dispositions agrégées, des spécialisations,
importations de capacités, étendues de sources et mémoire linéaire de 64 Ko
Limite `fws_alloc`/`fws_dealloc`/`fws_realloc`. `interpret`, `jit` et `aot` sont des exécutions
modes sur la même sémantique instruction/valeur/piège ; Clés de cache JIT et AOT
les artefacts incluent les hachages du compilateur et de la source. Les capacités sont uniquement appelables
lorsqu'il est présent dans le manifeste du module.

L'état d'exécution réactif est constitué de données : les index d'entité utilisent des compteurs de génération,
les magasins de composants et les mondes sont des instantanés immuables, et les systèmes renvoient le monde
transitions. Signaux, abonnements, exigences de requête, ordre déterministe,
et les étapes limitées du planificateur sont des valeurs explicites. L'intégration de l'hôte ECS nécessite
la même limite de capacité déclarée que toute autre importation FWS.

## Limite du champ d'application

L'implémentation v1 est une interface TypeScript plus WebAssembly déterministe
backend, exposé via la façade de compatibilité et la CLI Node autonome.
Les appareils de conformité et les artefacts générés sont la cible de compatibilité.

La compilation auto-hébergée (exécutant le compilateur en tant que programme FWS) est explicitement
pris en charge par la surface sans classe de ce contrat v1 et l'exécution du bytecode de la VM
modèle, mais cela n'est pas requis pour l'exactitude de l'ABI v1 et du langage
frontière. Fonctionnalités linguistiques plus riches, remplacement de Rust ou
Les charges de travail AssemblyScript et autres évolutions du compilateur non-v1 sont en dehors de cela
contrat.

## Basculement d’outillage et limite d’amorçage

La CLI, le plug-in Vite, le service de langage et le LSP consomment tous le compilateur public.
contrat de service. La migration lexer est intentionnellement LSP d'abord : l'enregistrement
La grammaire EBNF définit le contrat de jeton TypeScript, le service linguistique et
les adaptateurs d'éditeur constituent la première limite d'acceptation, et le compilateur/frontend ou
la propriété auto-hébergée ne doit pas bouger tant que les types de jetons, les diagnostics, les symboles,
les plages d'achèvement, de survol et UTF-16 sont conformes. Le modèle actuel limité créé par FWS
L'étape lex/token reste un chemin de parité de compatibilité tandis que l'étape lexer TypeScript
et la porte des services linguistiques sont en cours de migration ; ce n'est pas l'autorité grammaticale.

Une fois que la porte LSP est verte, la même grammaire sera portée vers le lexer FWS/VM
puis à l'étape analyseur-module limitée. Le frontend restant, l'éditeur de liens,
les étapes d'optimisation, de manifeste et d'émission Wasm sont toujours basées sur des graines dans ce
libération; cette frontière est intentionnelle et est exposée comme
`ForgeWebScriptSelfHostedStageReport` plutôt que d'être présenté comme complet
auto-hébergement.

La CLI sélectionne le mode VM avec `--vm-mode interpret|jit|aot`. Le plugin Vite
et les options d'espace de travail de service de langage utilisent le `selfHostedVmMode` correspondant
valeur. Les trois modes exécutent le même bytecode et comparent l'empreinte digitale Lex
avec la référence de semences indépendante. Une incompatibilité ou un piège de VM devient la stabilité
`FWS-BOOTSTRAP-001` et empêche qu'un artefact Wasm non valide soit
émis. `interpret` est destiné aux contrôles rapides, tandis que `jit` et `aot` sont
modes de conformité/développement ; Wasm compilé reste la production normale
artefact et chemin d’exécution.

Liaison de graphiques, déclarations, cartes sources, manifestes ABI, hachages déterministes,
propriété de la mémoire linéaire, déni de capacité, valeurs de collection/ECS et explicite
Les capacités du planificateur asynchrone restent régies par les contrats publics existants.
Les adaptateurs d'outils n'ajoutent pas d'API d'hôte ambiant ni de répartition d'objet implicite.
Les microtâches et les Web Workers sont disponibles uniquement via le planificateur déclaré
capacités, et leur ordre reste explicite et déterministe. Consommateurs
doit traiter le rapport de la VM comme un signal de parité/conformité jusqu'aux versions ultérieures
déplacez les étapes supplémentaires du compilateur derrière la même limite FWS.
