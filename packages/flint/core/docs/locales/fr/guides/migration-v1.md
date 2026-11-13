# Migrer vers le pipeline FWS sécurisé par défaut

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/flint/core/docs/guides/migration-v1.md: [packages/flint/core/docs/guides/migration-v1.md](../../../guides/migration-v1.md)
> Langue: Français (fr)

Ce guide est destiné aux modules FWS écrits avant les locaux immuables, les emprunts explicites,
et les métadonnées vérifiées de la politique de limites sont devenues partie intégrante du contrat v1.

## Rendre la mutation explicite

Ajoutez `mut` aux paramètres locaux et aux paramètres attribués. Ajoutez `&` pour un immuable
emprunter et `&mut` pour un emprunt mutable ; les emprunts mutables ne peuvent pas se chevaucher.

```flint
fn increment(mut value: i32) -> i32 {
  value = value + 1;
  value
}

fn inspect(values: &Vector<i32>) -> i32 { values[0] }
fn update(values: &mut Vector<i32>) -> unit { values[0] = 1; }
```

Ne vous fiez pas à la propriété déduite. Les valeurs POD sont transmises par valeur par défaut ;
les valeurs non POD utilisent des références immuables. Conservez `owned`, `borrowed` et `shared`
sur les limites de l'ABI où une responsabilité spécifique en matière de durée de vie ou de libération est
requis. Une région temporaire ne peut pas être restituée ou stockée dans un environnement à durée de vie plus longue.
valeur sans limite explicite de propriété/promotion.

## Choose and audit bounds policy

Les vérifications des limites d'exécution restent la valeur par défaut :

```bash
flint compile src/main.flint --bounds-checks runtime --format json
```

Utilisez `proven-safe` uniquement lorsque l'analyse prouve chaque accès depuis la longueur de la collection
et les faits sur la plage d'index. `excluded-by-profile` est une version explicite et vérifiable
choix, pas un raccourci pour les index inconnus :

```bash
flint check src/main.flint --bounds-checks proven-safe --optimizer-report
```

Examinez les résultats de l’analyse et la politique du manifeste avant l’expédition. Inconnu ou
les index non fiables doivent utiliser `runtime` ; une analyse stricte rejette une politique dangereuse
demandes.

## Inspecter les métadonnées du cache générées

Le cache du compilateur peut contenir `<key>.sonir.json`, un résumé déterministe de
le graphique Sea-of-Nodes optimisé. Inspectez-le sans exécuter de code invité :

```bash
flint inspect-sonir .cache/main.sonir.json --format json
```

L'artefact enregistre les versions de schéma et de langage/ABI, les hachages de source et de graphique,
mode d'optimisation, politique de limites, effets, métadonnées de propriété, étendues de source,
et ordonné des rapports de réussite. Obsolètes, mal formées, surdimensionnées ou non conformes aux règles
les artefacts sont ignorés et peuvent être supprimés en toute sécurité.

## Strict static typing and absence of dynamic types

Flint est un langage à typage statique avec une disposition de mémoire déterministe et une surcharge de réflexion à l'exécution nulle. Le langage ne prend pas en charge les types principaux dynamiques tels que `any` ou `unknown`.

Toute tentative d'annotation de types avec `any` ou `unknown` produit un diagnostic au moment de la compilation `FLINT-TYPE-020`. Pour migrer du code à partir d'environnements dynamiques :

- Remplacer les valeurs dynamiques par des primitives concrètes (`i32`, `u32`, `f64`, `bool`, `string`, `bytes`).
- Utiliser le polymorphisme paramétrique/génériques (`Vector<T>`, `Option<T>`, `Result<T, E>`) pour les algorithmes de conteneurs réutilisables.
- Utilisez des types de données algébriques balisés (`enum`) pour les représentations de domaines polymorphes.
- Pour les pointeurs C ABI et les handles d’hôte opaques, déclarez `opaque foreign type Handle;` plutôt que les pointeurs non typés.
- Dans les ponts et liaisons Web IDL, fournissez des mappages de types explicites via `FlintBindingOptions.customTypeMappings`.

## Comportement de mémoire et de libération

Les valeurs étendues utilisent des régions cochées. Les valeurs qui survivent à une région utilisent des
ARC/poignées partagées ; chaque poignée conservée a une version correspondante et des cycles
ne sont pas implicitement acceptées. `fws_alloc` bruts, `fws_realloc` et `fws_dealloc`
restent la limite ABI vérifiée appartenant à l’appelant. La suspension asynchrone et itératrice est
une limite d'échappement, donc les valeurs utilisées après la suspension doivent être conservées explicitement.
