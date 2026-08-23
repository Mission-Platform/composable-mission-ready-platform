# Scanner de code — Plan d'amélioration de la précision et enregistrement de migration

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/code-scanner/docs/accuracy-improvement-plan.md: [packages/code-scanner/docs/accuracy-improvement-plan.md](../../accuracy-improvement-plan.md)
> Langue: Français (fr)

Un plan pour augmenter le taux de lecture de `@mission-platform/code-scanner` sur les captures du monde réel (téléchargements et caméra en direct
frames) et pour conserver le pipeline d'analyse dans un artefact Forge Web Script/WebAssembly lié statiquement.

> **Implémentation actuelle :** Le scanner est livré sous la forme d'un
> Graphe Forge Web Script sous `src/fws`, avec un profil source-module dynamique
> disponible pour les modules de décodeur pouvant être mis en cache indépendamment. La rouille et la caisse
> les références retenues ci-dessous concernent uniquement la provenance historique de la migration ; ils sont
> ne pas empaqueter les dépendances d'exécution ni construire les entrées.
>
> **Avancée :** Phase 0 (tests d'images générées élargis), Phase 1 (déplacement
> tout le pipeline en un seul artefact en cours) et **Phase 2** (binarisation adaptative + gris
> échantillonnage de sous-pixels avec effacements Reed-Solomon + nouvelle tentative du localisateur↔décodeur
> boucle) sont **terminés** — voir §1, §2 et §4. **La phase 3 est maintenant terminée :** l'UPC-A /
> Désambiguïsation EAN-13 (§2 point 5), Data Matrix + tolérance rotation/inclinaison 1D
> (item 4), le localisateur aztèque (item 6) et le scanning multi-symbole + ROI (item 7)
> ont tous atterri.

L'implémentation originale a divisé le pipeline :

- **Locate + sample** exécuté dans un ancien pipeline natif/wasm : `binarize` → localisateurs par symbologie. Son point d'entrée `scan`
  a renvoyé un **tampon balisé** `[format, ...payload]` — il n'a **pas** décodé.
- **Decode** s'exécutait en JavaScript et appelait des modules de décodage distincts.

La phase 1 a remplacé cela par un seul appel FWS `scan_and_decode` (voir §1) ; le
la motivation historique ci-dessous est conservée comme justification, tandis que la source actuelle de
la vérité est le graphe FWS et sa suite de conformité Vitest.

## 1. Le problème structurel principal : le pipeline a traversé deux fois la frontière wasm↔JS

Avant la phase 1, une seule analyse était :

```
image (JS)
  → wasm code-scan.scan()            [Rust: binarise + locate + sample]
  → tagged module buffer (JS)        [cross back into JS]
  → decodeQr / decodeMatrix / decodeBarcode (JS façades)
  → wasm qr/matrix/barcode-decode    [cross into a *different* wasm module]
  → payload string (JS)
```

Chaque symbole localisé est copié hors de wasm, remodelé dans JS, puis copié dans une deuxième instance wasm pour décoder. C'est
l'aller-retour que le problème appelle. Cela nuit à la fois aux performances et, plus important encore pour ce plan, à la **précision**, car
le localisateur et le décodeur ne peuvent pas coopérer :

- **Aucun retour de décodage vers le localisateur.** Le localisateur Rust s'engage sur un _single_
  binarisation, taille des symboles et grille de modules. Si la grille échantillonnée échoue Reed-Solomon/checksum dans le décodeur JS, il y a
  aucun moyen de demander au localisateur de rééchantillonner avec un seuil différent, une taille de module ±1 ou une origine décalée. Un code qui
  est _localisé mais indécodable_ (le cas exact des cibles de journalisation de débogage)
  est tout simplement perdu.
- **Transfert avec perte.** Le localisateur aplatit l'état intermédiaire riche (niveaux de gris, centres de recherche de candidats, par module
  confiance) jusqu'aux bits `0/1` durs avant que le décodeur ne le voie. Le décodeur fonctionne alors uniquement à partir de bits.
- **La priorité des symbologies est un instrument brutal.** Pour les codes 1D, le côté JS essaie les symbologies dans un ordre fixe et
  renvoie le premier qui lit. Parce que UPC-A est un sous-ensemble au niveau du module d'un EAN-13 à zéro non significatif, un symbole UPC-A est
  signalé comme EAN-13 (vérifié par la nouvelle suite de tests). Le décodage dans Rust permet au localisateur de transporter des indices structurels (élément
  compte, modèles de garde) pour choisir la bonne symbologie.

### Architecture cible : un appel FWS, entrée d'image, sortie de charge utile

> **Statut : implémenté.** Le scanner exporte `scan_and_decode`, relie le
> décodeur graphique FWS directement, et la façade JS décode via ce seul
> appeler. Les détails ci-dessous enregistrent la justification de la migration.

```
image (JS)
  → FWS scanner.scan_and_decode()      [binarise + locate + sample + decode]
  → ScanOutcome { format, value } (JS)
```

`scan_and_decode(width, height, luma) -> Option<ScanOutcome>` exécute l'ensemble du pipeline à l'intérieur de `src/fws/scanner.fws` et
renvoie directement la **charge utile décodée** (`value` est vide lorsqu'un symbole est localisé mais non décodable). La façade JS
(`scanner/index.ts`) est une fine couche de tri qui relie les sources FWS QR, matricielles et codes-barres au moment de la construction ;
ces packages restent publiables indépendamment.

#### Pourquoi c'est faisable maintenant

Les caisses du décodeur exposent déjà des noyaux simples et `crates/code-scan`
**les lie déjà pour ses tests natifs** (appels `tests/pipeline.rs`
`mission_platform_barcode_decode::decode_modules`,
`mission_platform_matrix_code_decode::decode`, etc.). La seule raison pour laquelle ils sont confinés à
`[target.'cfg(not(target_arch = "wasm32"))'.dev-dependencies]` est que chaque caisse de décodeur exporte un
`#[wasm_bindgen] pub fn decode`, et lier plusieurs d'entre eux en un seul cdylib entrerait en conflit avec le `decode` exporté.
symbole.

Le correctif était un petit refactor mécanique — **les quatre étapes sont maintenant terminées** :

1. **Chaque décodeur a un point d'entrée en rouille simple** qui n'est _pas_ `#[wasm_bindgen]`
   (`decode_modules`, `decode_matrix`, `decode_qr`) et `#[wasm_bindgen]`
   Les exportations `decode`/`start` sont protégées par une nouvelle fonctionnalité de caisse `wasm-api` (activée par défaut et implicite par `console`).
2. **`code-scan` dépend des caisses du décodeur avec `default-features = false`**
   (donc `wasm-api` est désactivé), promu des dépendances de développement aux dépendances réelles. Aucun symbole wasm-bindgen `decode` n'est
   compilé dans le scanner cdylib, il n'y a donc pas de conflit — vérifié en reconstruisant le scanner wasm.
3. **`scan_and_decode`** dans `crates/code-scan/src/lib.rs` localise, puis appelle les cœurs Plain-Rust des décodeurs en cours de processus
   et renvoie un format `ScanOutcome {,
value }` (a `#[wasm_bindgen]` struct; `value` is `undefined` lorsqu'il n'est pas décodable).
4. **La façade JS est allégée** : le routage `decodeTagged` et les importations des trois packages décodeurs ont disparu,
   remplacé par un seul appel `scan_and_decode`.

Il s’agit de l’étape permettant toute amélioration de la précision ci-dessous, car la localisation et le décodage partagent désormais un seul espace d’adressage.

## 2. Améliorations de la précision débloquées une fois le décodage effectué dans Rust

Classé approximativement en fonction de l'impact attendu sur le taux de lecture. **Les éléments 1 à 3 (Phase 2) et les éléments 4 à 7 (Phase 3) sont terminés** ; chacun est
annoté ci-dessous.

1. **Localisateur ↔ boucle de nouvelle tentative du décodeur. _(terminé — Phase 2.)_** Lorsque la première tentative de décodage échoue, `scan_and_decode`
   ré-échantillonne sans quitter Rust : il tente une seconde binarisation (adaptative), l'origine du sous-module se déplace
   (`SAMPLE_OFFSETS`), et un décodage à la fois aveugle et sensible à l'effacement, acceptant le premier candidat qui réussit le test du symbole.
   propre correction d’erreur. Cela attaque directement les échecs _localisés mais non décodables_.
2. **Binarisation locale/adaptative. _(terminé — Phase 2.)_** `image::binarize` (**Otsu** global) est conservé comme premier rapide
   tentative; `image::binarize_adaptive` ajoute un seuil **local moyen-C** fenêtré (via une image intégrale) donc l'éblouissement,
   les dégradés et l'éclairage inégal ne fusionnent plus les modules sombres avec l'arrière-plan. La boucle de nouvelle tentative essaie les deux.
3. **Échantillonnage de module de niveau de gris (sous-pixel). _(terminé — Phase 2.)_** `qr` et
   `datamatrix` a gagné `scan_with_confidence`, qui échantillonne les centres de module à partir de l'image _grey_ avec des
   l'interpolation et signale les modules proches du seuil local comme étant de faible confiance. Ceux-ci sont transmis aux décodeurs
   (`decode_qr_with_erasures` / `decode_matrix_with_erasures`) alors que Reed-Solomon **efface**, ce que le
   correcteur d'erreurs et d'effacements (`gf`, `reed_solomon`)
   des réparations jusqu'à deux fois plus rapides que les erreurs inconnues.
4. **Robuste multi-échelle + rotation pour 1D et Data Matrix. _(terminé — Phase 3.)_** Le localisateur QR était déjà
   tolérant à la rotation grâce à ses trois centres de recherche. Data Matrix lit désormais à **n'importe quelle** rotation : une affine basée sur les coins
   localisateur (`scan_oriented_candidates` — quatre coins d'encre extrêmes, le coin L détecté à partir de ses bords solid, le
   coin opposé reconstruit par la règle du parallélogramme, taille lue sur les bords de synchronisation, échantillonnée le long de l'indépendant
   axes de colonne/ligne pour que le cisaillement soit également géré)
   couvre les angles modérés et une solution de repli de redressement et de nouvelle tentative récupère les angles prononcés : `Bitmap::orientation` trouve le
   rotation via un balayage de boîte englobante de surface minimale (robuste dans la famille 45°, où les coins extrêmes dégénèrent),
   `image::rotate_luma` redresse le cadre et le pipeline vertical réglé l'échantillonne. Les codes-barres 1D sont traités
   de la même manière - l'inclinaison est récupérée et le cadre redressé (les quatre orientations d'alignement des axes ont été essayées) de sorte que le
   des lignes de balayage horizontales traversent les barres. Couvert par des tests de pipeline de capture en rotation sur une gamme d'angles (incl.
   45°/90°/180°+) et les profils de dégradation JS renforcés.
5. ** Désambiguïsation de la symbologie pour 1D. _(terminé — Phase 3.)_** L'ambiguïté UPC-A vs premier zéro-EAN-13 est résolue par
   le **chiffre du système numérique** :
   `decode_any_barcode` post-traite la symbologie gagnante via
   `disambiguate_symbology`, qui rapporte un EAN-13 dont le chiffre du système numérique est
   `0` comme formulaire UPC-A à 12 chiffres (zéro initial supprimé) tout en laissant le véritable EAN-13 intact. _Remainant :_ portant
   une structure localisée plus riche (positions des barres de garde, nombre d'éléments) dans la décision et exposant la symbologie prévue
   afin que les appelants puissent le limiter.
6. **Support aztèque. _(terminé — Phase 3.)_** Le `@mission-platform/matrix-code`
   l'encodeur produisait déjà Aztec, mais le scanner n'avait pas de _locator_ aztèque. Ajout d'un localisateur compact aztèque bullseye
   (`crates/code-scan/src/aztec.rs`) : il trouve la cible centrale grâce à sa signature de recherche `1:1:1:1:1:1:1:1:1` à neuf passages
   (les sept pistes intérieures sont fiables, les deux extérieures seulement sont obligatoires car elles touchent l'anneau de mode), le vérifie sur les deux axes,
   récupère la taille du module, échantillonne chaque taille compacte plausible (15/19/23/27) sur une copie nettoyée et achemine chacune d'elles
   au chemin de décodage aztèque existant, dont le message de mode + les vérifications Reed-Solomon rejettent les mauvaises tailles. `scan_and_decode`
   le signale comme `FORMAT_AZTEC`.
7. **Analyse de symboles multiples + ROI. _(terminé — Phase 3.)_** `scan_and_decode_all`
   renvoie chaque symbole décodé distinct (un balayage grossier à fin de l'ensemble du cadre, des moitiés et des quadrants se chevauchant,
   dédupliqué par `(format, value)`), et
   `scan_and_decode_roi` recadre une région fournie par l'appelant **dans Rust avant**
   binarisation, de sorte qu'un recadrage de réticule rejette d'emblée le fouillis environnant. Les deux font surface dans la façade JS
   (`scanImageDataAll`, `scanImageData(image, roi)`).

## 3. Stratégie de validation

Le travail de précision doit être mesuré et non affirmé à l’œil nu.

- **Tests aller-retour d'images générées.**
  `src/scanner/index.spec.ts` restitue de nombreuses sorties d'encodeur : cinq charges utiles QR dans toutes les tailles/UTF-8 plus les quatre ECC
  niveaux, quatre charges utiles Data Matrix et sept symbologies 1D (`code128`, `code39`, `ean13`, `ean8`, `upca`, `itf`,
  `codabar`) — et affirme le chemin complet `render → locate → sample → decode` (maintenant le chemin unique
  `scan_and_decode`) récupère la charge utile. Les cas 1D se comparent à la priorité de la symbologie du scanner
  (y compris l'homonymie UPC-A/EAN-13).
- **Encodage↔décodage de tous les types de codes aller-retour.** `crates/code-scan/tests/generated.rs`
  encode **chaque** symbologie que les encodeurs peuvent produire - QR (4 niveaux ECC), les quatre symbologies matricielles (Data Matrix
  carré/rectangulaire, GS1 Data Matrix, Aztec)
  et les quinze symbologies 1D (y compris le code 93, GS1-128, UPC-E, ITF-14, MSI, Pharmacode) - et affirme que chaque décode
  fidèlement (ré-encoder l'égalité), couvrant les types de codes que le scanner ne peut pas encore _localiser_.
- **Cas de dégradation de phase 2.** `image.rs` teste unitairement la binarisation adaptative sur un gradient d'éclairage ; `tests/pipeline.rs`
  prouve qu'un QR dégradé par gradient que le chemin global-Otsu uniquement ne peut pas lire est récupéré par l'adaptatif de phase 2 +
  pipeline d'échantillonnage de gris ; les caisses RS testent la récupération des erreurs et des effacements au-delà de la capacité d'erreur aveugle.
- **Dégradation de capture par format.** Chaque image générée est déformée par un **projectif** déterministe.
  transformation - échelle d'aspect non uniforme, rotation, inclinaison et une **morph** indépendante par coin x/y/z (une homographie) -
  plus un bruit poivre et sel, avant de numériser. Les intensités sont ajustées par format, ce qui quantifie deux limites de localisateur
  mérite d'être corrigé (voir §2) : la grille basée sur le chercheur de QR est uniquement affine, elle ne tolère donc qu'un aspect _anisotrope_ léger et
  _perspective_ avant que les symboles plus grands ne dérivent ; le localisateur Data Matrix est uniquement vertical, il ne tolère donc qu'un léger
  rotation/inclinaison/morphing.
- **Matrice de dégradation.** Le Rust `tests/pipeline.rs` dégrade déjà les captures synthétiques (downscale, sel et poivre
  mouchetures, fouillis de zones calmes, un encombré
  "cadre de caméra"). Étendez cela dans un balayage de paramètres (échelle × bruit × rotation × flou) et signalez un ** taux de lecture
  pourcentage par format**, bloqué dans CI afin qu'un changement ne puisse pas le faire régresser silencieusement.
- **Corpus de capture réelle.** Collectez un ensemble de photos réelles (les rapports de terrain font référence à 448 × 336 images basse résolution
  et codes-barres ~ 3px/module) avec des charges utiles connues, et suivez le taux de lecture comme mesure principale dans les versions.
- **Déterminisme.** Gardez toutes les dégradations synthétiques semées (le `speckle` existant
  utilise un LCG fixe) afin que les résultats soient reproductibles.

## 4. Séquence suggérée

1. **Phase 0 — tests (terminés).** Élargissement de la suite d'images générées (avec aspect/rotation/inclinaison/morphe/bruit ensemencés).
   dégradation), le pipeline disposait donc d'un filet de sécurité avant la refactorisation.
2. **Phase 1 — consolider le décodage dans Rust (terminé).** Le refactoriseur de dépendances/fonctionnalités + `scan_and_decode` + façade JS
   mincir. Préservation du comportement ; validé par les tests aller-retour, pipeline et nouveau `scan_and_decode`, et par
   la reconstruction du scanner était impossible.
3. **Phase 2 — binarisation + échantillonnage de sous-pixels + boucle de nouvelle tentative (terminé).** Binarisation locale adaptative, bilinéaire gris
   échantillonnage avec confiance par module transmis aux décodeurs sous forme d'effacements Reed – Solomon, et le × global → adaptatif
   boucle de nouvelle tentative d'effacement/aveugle × décalage d'origine dans `scan_and_decode` — les plus gros gains en termes de taux de lecture, maintenant que la localisation et
   decode coopère dans un seul appel Rust.
4. **Phase 3 — rotation/inclinaison, désambiguïsation de la symbologie, aztèque, multi-symbole (en cours).** La symbologie 1D
   la désambiguïsation (§2 point 5) a atterri. Restant :
   Tolérance d'inclinaison de rotation Data Matrix/1D (élément 4), un localisateur aztèque (élément 6) et une analyse à symboles multiples + ROI (élément 7) - chacun a atterri derrière son propre delta de matrice de dégradation.

## 5. Suivis documentaires

- **Terminé :** `packages/code-scanner/README.md` a été mis à jour — le décodeur de codes-barres "1D" obsolète est toujours un échafaudage, donc
  les résultats des codes-barres portent la note `value: null`" qui est remplacée par le comportement de décodage de bout en bout (décodage des codes-barres ; UPC-A
  indique sa valeur à 12 chiffres, et non son alias EAN-13), et la section sur l'architecture décrit désormais l'unique
  Appel `scan_and_decode` plutôt que le transfert de décodage JS.

## 6. Harnais de corpus de boîte noire ZXING (taux de lecture de capture réelle)

Le "corpus" `tests/real_world.rs` du §3 a été réalisé comme le corpus complet **ZXing blackbox** (1 242 PNG répartis sur 56
dossiers de symbologie, chacun avec un `.txt`
valeur attendue ; Apache-2.0, vendu sous
`crates/code-scan/tests/fixtures/zxing-blackbox/` avec mention). Un harnais façon ZXing
(`crates/code-scan/tests/blackbox.rs`) exécute l'ensemble du système natif
`scan_and_decode` pipeline sur chaque image aux quatre rotations quart de tour (0/90/180/270) et compare chacune
par dossier et par rotation, nombre de réussites par rapport à une ligne de base validée (`tests/blackbox_baseline.toml`), échouant uniquement sur un
_régression_ — afin que les valeurs aberrantes non corrigibles ne bloquent jamais les progrès pendant que les véritables victoires sont mesurées. `falsepositives*` /
Les dossiers `unsupported` sont la garde inverse : leur base de référence est un _plafond_ de faux positifs.

### Étape 1 — corpus + chargeur généralisé + harnais _(terminé)_

Le corpus estvendu, le lecteur PNG a été généralisé (`tests/support/png.rs` :
palette de couleurs de type 3 aux profondeurs 1/2/4/8, niveaux de gris faible profondeur, RVB (A), gris+alpha, plus aides à la rotation 90/180/270
correspondant à la sémantique ZXing) avec un test unitaire de chargeur (`tests/png_loader.rs`), et la ligne de base est validée.

### Étape 2 — augmenter le taux de lecture sur les formats pris en charge _(en cours)_

Triage (classification par dossier de chaque image/rotation comme décodée/valeur erronée/localisée mais non décodée/
non localisé) a fait apparaître un motif clair :
le pipeline **localise désormais presque tout** mais **décode uniquement les captures propres**. Les échecs restants sont
majoritairement _localisé-mais-non-décodé_, pas _non-localisé_.

**J'ai réussi cette étape :**

- **Garde contre les faux positifs ITF.** Le 2-sur-5 entrelacé n'a pas de chiffre de contrôle et un démarrage/arrêt trivial, donc un croisement de ligne de balayage
  un symbole sans rapport (un QR, d'autres barres) trivialement « décodé » en une fausse valeur à 2 ou 4 chiffres. `itf::decode` maintenant
  rejette les charges utiles inférieures à **six chiffres**, correspondant à la limite inférieure du `ITFReader::DEFAULT_ALLOWED_LENGTHS` de ZXing
  (`{6,8,10,12,14}`). Cela a conduit les faux positifs dans `falsepositives`, `falsepositives-2` et `unsupported` à
  **zéro** et, en supprimant les lectures courtes qui court-circuitaient l'ordre de priorité, levé plusieurs points positifs
  dossiers (par exemple `qrcode-4`, `qrcode-5`). Couvert par un nouveau test de régression (`barcode-decode` :
  `itf_rejects_runs_shorter_than_six_digits`) et la mise à jour de la ligne de base.

**Prochaines opportunités quantifiées (localisées, non encore décodées) :**

- **Décodage de ligne 1D par chiffre (plus grande opportunité).** Les dossiers UPC/EAN localisent des centaines de lignes de numérisation mais décodent presque
  aucune des photos de l'appareil photo dur (`upca-2` 206 localisé/0 décodé, `upce-2` 160/0, `ean13-3` 204/6). La cause profonde
  est que le localisateur quantifie chaque ligne de balayage en une **unité de module globale unique** avant de transmettre les bits du module au
  décodeur; sous la perspective raccourcie, la véritable largeur du module varie à travers le symbole, de sorte que la grille globale dérive
  et une grille de cellules EAN/UPC rigide le rejette. Le correctif est un décodeur de lignes **par chiffre** de style ZXing qui correspond à chaque chiffre
  rapports de longueur d'exécution localement (variance de correspondance de modèle) au lieu d'une quantification globale - un changement plus important dans la
  Interface localisateur↔décodeur, suivie comme la prochaine itération de l'étape 2.
- **Échantillonnage de perspective QR / modèle d'alignement.** `qrcode-1` (77 localisés / 0 décodé) et `qrcode-6` (60 / 0) sont
  symboles de version supérieure : l'échantillonneur construit une grille purement **affine** à partir des trois centres de recherche, qui dérive à travers
  un symbole grand ou déformé en perspective. Utilisation du **modèle d'alignement** en bas à droite
  pour une transformation de perspective en quatre points (comme le fait `Detector` de ZXing), c'est la victoire QR correspondante.
- **Dimensionnement Data Matrix + polarité.** L'unique Data Matrix `inverted` est désormais localisé après une inversion de polarité mais
  mal dimensionné par le localisateur (22 × 22 pour un symbole numérique à 10 chiffres dont la vraie taille est de ~ 12 à 14), il ne décode donc pas ; un
  Une nouvelle tentative de polarité inversée plein format a été prototypée mais annulée pour cette étape car elle a doublé le temps de balayage du corpus
  pour des gains nets de corpus nuls (le bloqueur est le dimensionnement DM, pas la polarité). Le support inversé devrait revenir une fois le localisateur DM
  le dimensionnement est resserré, limité de sorte que la passe supplémentaire ne s'exécute que sur des images qui autrement échoueraient.
- **Échantillonnage aztèque.** `aztec-1` (68 localisés / 0 décodé) : la cible est trouvée mais l'échantillonnage de la grille alignée sur l'axe le fait
  pas encore récupéré ces captures.

### Étape 3 — GS1 DataBar (RSS-14) encodage + décodage + localisateur _(RSS-14 terminé)_

Un nouveau trio de caisses reflète la répartition `*-common` / `*-encode` / `*-decode` du dépôt :

- **`gs1-databar-common`** — les primitives combinatoires ISO/IEC 24724 portées du `RSSUtils` de ZXing : `combins`,
  `get_rss_value` (largeurs → valeur, décodage) et son inverse exact `get_rss_widths` (valeur → largeurs, encodage), plus le
  matcheur de recherche de variance de rapport de largeur. Un test unitaire affirme que le mappage valeur/largeurs est auto-inverse dans chaque RSS-14
  sous-ensemble.
- **`gs1-databar-decode`** — un portage fidèle du `RSS14Reader` de ZXing : détection du chercheur, `parseFoundFinderPattern`,
  `decodeDataCharacter` (avec l'ajustement du nombre impair/pair) et la somme de contrôle mod-79, reconstruisant le GTIN à 14 chiffres.
  Étant donné que les caractères DataBar sont décodés à partir des _ratios_ de largeur d'élément (et non d'une grille de glyphes fixe), le décodeur de ligne lit run
  longueurs directement à partir d'une ligne de balayage - il tolère donc la largeur variable du module d'une capture raccourcie qui va à l'encontre
  le chemin 1D de quantification globale (§2).
- **`gs1-databar-encode`** — la valeur → module-bit inverse. Sa disposition physique (garde-corps, élément extérieur/trouveur/intérieur)
  ordre et la paire inversée intérieur/droite) a été identifiée en comparant les largeurs d'éléments mesurées par le décodeur à partir d'un
  symbole de corpus réel par rapport aux caractères calculés de l'encodeur, puis confirmé par un aller-retour encodage → décodage.

Le scanner a gagné `crates/code-scan/src/gs1_databar.rs`, un localisateur fin qui fournit des lignes de numérisation prometteuses
(lignes de transition les plus chargées, puis colonnes pour les captures 90°/270°) au décodeur de lignes ; la forte somme de contrôle RSS-14 fait un
match faisant autorité, il ne rapporte donc qu'une valeur décodée ou rien (en gardant la garde faux positif propre). Il est filaire
dans `scan_and_decode` en tant que nouveau
Balise `FORMAT_DATABAR` (avec `FORMAT_PDF417` / `FORMAT_MAXICODE` réservés aux étapes ultérieures).

**Résultat :** les dossiers du corpus `rss14-1` et `rss14-2` sont passés de **0 → 16**
décodages corrects sur les quatre rotations (lignes lues 0°/180°, colonnes lues 90°/270°), sans **aucune régression** en aucun cas
l'autre dossier et les dossiers négatifs toujours à **zéro** faux positifs. Les allers-retours sont couverts par
`gs1-databar-decode/tests/roundtrip.rs` et `code-scan/tests/generated.rs`.

**Prochaine itération de DataBar :** GS1 DataBar **étendu** et **étendu-empilé**
(`rssexpanded-*`, `rssexpandedstacked-*`) sont un décodeur séparé et plus grand (un analyseur IA/champ à usage général plus
assemblage de rangées empilées) et restent à la ligne de base 0, suivie comme suivi de cette étape. RSS-14 **Stacked** a également besoin
assemblage à deux rangées dans le localisateur.

### Étape 4 — Encodage PDF417 + décodage + localisateur de lignes empilées _(terminé)_

Un nouveau trio de caisses reflète la division `*-common` / `*-encode` / `*-decode` du dépôt, portant `com.google.zxing.pdf417.*`
(Apache-2.0) :

- **`pdf417-common`** — les tables partagées et les mathématiques dont les deux parties ont besoin : le symbole ↔ les tables de mots de passe (2 787 entrées,
  générés à partir de la référence ZXing), les recherches de mots de code/cluster (`get_codeword`, `bucket_from_symbol`), les
  module-bit-count → échantillonneur de symboles (chemin rapide exact plus un repli au rapport le plus proche construit paresseusement), et le **GF (929)
  Décodeur de correction d'erreurs Reed – Solomon** (`ModulusGF` / `ModulusPoly` / algorithme euclidien). Un test unitaire affirme chaque
  la valeur du mot de passe a un symbole dans chacun des trois clusters et allers-retours.
- **`pdf417-decode`** — Correction EC GF (929) plus un analyseur de flux binaires de haut niveau (`DecodedBitStreamParser`) couvrant
  **Texte**, **Octet** et **Numérique**
  compactage. Il consomme le tableau de mots de passe plat assemblé par le localisateur et renvoie la charge utile.
- **`pdf417-encode`** — un encodeur Byte-Compaction (n'importe quel octet de charge utile fait exactement un aller-retour), le dimensionnement des dimensions, le
  Générateur de mots de passe EC (`EC_COEFFICIENTS` pour les neuf niveaux EC, générés à partir de la référence) et module-matrice
  Disposition (protections start/stop, indicateurs de rangée gauche/droite). Il expose à la fois le tableau de mots de code (pour le niveau de mot de code
  allers-retours) et le bitmap du module compressé (pour les tests de chemin d'image).

Le scanner a gagné `crates/code-scan/src/pdf417.rs`. PDF417 est un _empilé linéaire_
symbologie, de sorte que le localisateur travaille une ligne de balayage à la fois : sur chaque ligne d'image, il trouve la garde de départ, lit 17 modules
mots de passe (8 barres/espaces chacun) jusqu'au stop guard, vote les métadonnées de colonne/nombre de lignes/niveau EC à partir de la ligne
indicateurs, place les mots de passe de données dans une matrice `rows × cols` (votée à la majorité par cellule sur les lignes de balayage qui
couvrir chaque rangée de codes-barres) et le remet au décodeur vérifié par RS. Un deuxième passage lit chaque ligne de droite à gauche afin qu'un
Le symbole tourné à 180° est toujours décodé. Il est câblé dans `scan_and_decode` sous le nom `FORMAT_PDF417`.

Deux détails de robustesse se sont révélés essentiels :

- **Échantillonnage exact uniquement dans le hot path.** L'échantillonneur par exécution utilise uniquement la correspondance exacte
  (`sample_codeword_symbol_exact`); une exécution qui n'échantillonne pas proprement devient un _hole_ `-1` qui préserve la colonne
  alignement et est ignoré lors du vote. Cela continue de numériser chaque ligne de chaque image à moindre coût - le O (taille de la table)
  Le repli au rapport le plus proche dominerait autrement le balayage du corpus.
- **Un trou de protection contre la surcorrection RS.** Avec des niveaux d'EC élevés, Reed-Solomon se fera un plaisir de fabriquer un
  Mot de code _valide-mais-mauvais_ provenant d'un assembly presque vide (observé comme décodage `"AAAA…"` inutile). Le localisateur donc
  refuse de décoder lorsque le nombre de trous dépasse `num_ec / 2` (le budget de correction RS), ce qui a supprimé **tous**
  décoder les déchets tout en conservant tous les bons - et en gardant propre la protection contre les faux positifs du dossier négatif.

Un bug corrigé en cours de route : le bras par défaut de l'analyseur de flux binaires pouvait tourner indéfiniment sur un flux corrompu (réexécution du texte
compactage au niveau d'un mot de code qu'il ne peut pas consommer) ; il renonce désormais lorsqu'il ne progresse pas.

**Résultat :** `pdf417-1` / `pdf417-2` / `pdf417-3` est passé de **0 → 8/13/8**
décode correctement à la rotation 0, puis à nouveau à 180° (**58** correct sur toutes les rotations), sans **aucune régression** dans les autres
dossier et les dossiers négatifs toujours à **zéro** faux positifs. Les allers-retours sont couverts par
`pdf417-decode/tests/roundtrip.rs` et `code-scan/tests/generated.rs`, ainsi que le chemin complet de l'image (encodage → rendu →
`scan_and_decode`, y compris. 180°) par
`code-scan/tests/pipeline.rs`.

**Prochaine itération PDF417 :** les rotations **90°/270°** restent à la ligne de base 0 — un symbole quart de tour se présente sous forme de barres verticales
que le localisateur de balayage de lignes ne lit pas. Une passe de balayage de colonne (transposition), ou le harnais alimentant le cadre transposé, est
le suivi de l'appariement. Une inclinaison plus prononcée nécessiterait le modèle de perspective `Detector` à quatre coins complet de ZXing.

### Étape 5 — Encodage + décodage + localisateur hexagonal MaxiCode _(terminé)_

Un nouveau trio de caisses reflète la division `*-common` / `*-encode` / `*-decode` du dépôt, portant `com.google.zxing.maxicode.*`
(Apache-2.0) :

- **`maxicode-common`** — les primitives partagées dont les deux côtés ont besoin : la géométrie du symbole fixe (30 colonnes × 33 lignes), le
  **`BITNR`** par cellule → carte de bits de mots de code (portage de `BitMatrixParser.BITNR` de ZXing, transcrit et testé unitairement afin que chacun
  des 864 bits de données apparaissent exactement une fois), le `read_codewords` / `place_codewords`
  paire inverse et le correcteur **GF (64) Reed – Solomon ** (primitif `x⁶+x+1`, générateur de base 1) avec erreurs uniquement
  Berlekamp-Massey/Chien/Forney. Les tests unitaires couvrent un mot de passe propre, une correction jusqu'à la moitié du budget de la CE et un
  bloc incorrigible.
- **`maxicode-decode`** — un portage fidèle de `Decoder` + de ZXing
  `DecodedBitStreamParser` : il corrige le bloc primaire (10 données + 10 EC dans son ensemble) et le bloc secondaire (pair/impair
  entrelacements corrigés indépendamment), lit le quartet de mode, assemble les mots de données et exécute le jeu de cinq
  (`SETS[0..5]`) flux de verrouillage/décalage/compactage de nombres, y compris la porteuse structurée en mode 2/3
  Assemblage code postal/pays/classe de service. Étant donné que les trois blocs RS doivent être validés, une valeur renvoyée fait autorité.
- **`maxicode-encode`** — un écrivain sans dépendance ciblant le mode 4/5 avec les jeux de caractères principaux A et B (assez pour
  coder les charges utiles ASCII et amorcer les allers-retours), générant l'EC primaire + secondaire entrelacé et posant les 144
  mots de passe dans la grille du module via la carte partagée `BITNR`.

Le scanner a gagné `crates/code-scan/src/maxicode.rs`. MaxiCode est lu comme un symbole _pur_, exactement comme celui de ZXing
`MaxiCodeReader` fait : le localisateur prend le rectangle englobant les pixels sombres et échantillonne la grille fixe 30×33
dessus, en décalant la position x de l'échantillon d'un demi-module sur les lignes impaires pour suivre le décalage hexagonal. Un aspect carré pas cher
le garde saute évidemment les régions non MaxiCode (codes-barres 1D, étiquettes hautes) avant l'échantillonnage, et les trois blocs RS rejettent
toute image non-MaxiCode échantillonnée de cette façon. Il est câblé dans `scan_and_decode` comme
`FORMAT_MAXICODE`.

**Résultat :** le dossier `maxicode-1` est passé de **0 → 9** décodages corrects à la rotation 0 (les neuf images — modes 2 à 5 et
l'échantillon injecté par erreur), avec **aucune régression** dans aucun autre dossier et les dossiers négatifs toujours à **zéro**
des faux positifs. Les allers-retours sont pris en charge par `maxicode-decode/tests/roundtrip.rs`
(encodage → grille de modules → décodage, y compris récupération d'erreur RS) et
`code-scan/tests/generated.rs`.

**Prochaine itération MaxiCode :** comme ZXing, l'échantillonneur de bits purs est uniquement vertical, donc les rotations **90°/180°/270°** restent à
ligne de base 0 (un symbole pivoté échantillonne incorrectement la grille hexagonale et RS la rejette – pas de faux positifs). Une cible
un chercheur qui récupère la rotation du symbole avant que l'échantillonnage ne soulève les trois autres rotations.

### Étape 6 — câbler les nouveaux formats dans la façade JS + créer l'artefact FWS _(terminé)_

Les étapes 3 à 5 ont fait atterrir PDF417, GS1 DataBar (RSS-14) et MaxiCode dans le scanner
pipeline derrière les balises `FORMAT_PDF417` / `FORMAT_DATABAR` / `FORMAT_MAXICODE`, alors que la façade JS ne connaissait que le
quatre formats originaux. Cette étape fait apparaître les nouvelles symbologies au moment de l'exécution :

- **`FORMAT_NAMES`** dans `src/scanner/index.ts` mappe désormais `4 → 'pdf417'`,
  `5 → 'databar'`, `6 → 'maxicode'` et l'union `ScanFormat` dans `src/types.ts`
  obtient les trois mêmes noms — donc `scanImageData` / `scanImageDataAsync` (et le
  `*All` / variantes ROI) les renvoient comme n'importe quel autre format.
- **L'artefact FWS du scanner est construit** à partir de `src/fws/scanner.fws` par le plugin Forge Web Script Vite. Le profil statique
  relie les graphiques du décodeur en un artefact autonome, active WebAssembly SIMD et applique un temps de liaison agressif
  optimisation ; le profil dynamique conserve les limites explicites du module de décodeur et met en cache la répartition des exportations.
- **Les suites graphiques et façades FWS** (`src/fws/scanner-graph.spec.ts` et
  `src/scanner/index.spec.ts`) exercer les graphiques du décodeur liés via le
  scanner ABI et les deux points d'entrée publics, y compris PDF417, GS1 DataBar,
  Chemins MaxiCode, ROI, multi-résultats, synchrones et asynchrones. Le
  Le dispositif de texte PDF417 package-local maintient le cas de conformité indépendant de
  l'espace de travail du corpus natif retiré.

**Résultat :** `vitest` est vert par rapport à l'artefact FWS et à la build `tsc`
le chèque est propre. Les familles accompagnées restent couvertes de manière exhaustive par le
les suites graphiques et de façade publique, ainsi que la hiérarchisation des modèles par étape qui ont guidé le
l'effort est documenté dans `docs/model-cost-strategy.md`.

### Étape 7 — Décodeur de ligne 1D par chiffre de style ZXing pour les photos UPC/EAN de l'appareil photo _(terminé)_

Le mode de défaillance du corpus restant dominant était les codes-barres 1D **localisés mais non décodés**. Le chemin 1D original
(`barcode.rs` → `barcode-decode`) échantillonne chaque ligne de balayage candidate dans une série plate de bits de module en quantifiant chaque
exécuté sur une **unité de module globale unique**. C'est exact sur un téléchargement propre, mais sur une photo d'appareil photo, la largeur du module est
pas constant à travers le symbole - la perspective, le flou et l'impression inégale l'étirent - donc une unité globale en arrondit plusieurs
éléments contre la mauvaise grille et le décodeur de cellules EAN/UPC rigide rejette le résultat. Le symbole est _localisé_ (`scan`
renvoie les lignes de balayage candidates) mais jamais _décodées_.

Le correctif est un nouveau `crates/code-scan/src/barcode_row.rs`, un portage fidèle de la famille `UPCEANReader` de ZXing. Ce n'est jamais
quantifie sur une grille globale : il parcourt la ligne de balayage motif par motif et, pour **chaque chiffre indépendamment**, normalise
les quatre largeurs de passage de ce chiffre à la cellule de sept modules avant de la faire correspondre aux tableaux de largeur L/G/R
(`patternMatchVariance` avec `MAX_AVG_VARIANCE` /
`MAX_INDIVIDUAL_VARIANCE`). Parce que chaque chiffre porte sa propre unité locale, la dérive progressive à travers le symbole n'est plus nécessaire.
bat la lecture. Il couvre **EAN-13 / UPC-A** (via EAN-13, avec le premier chiffre récupéré des six moitiés gauches
bits de parité), **EAN-8** et **UPC-E** (qui n'avaient _pas_ de chemin de décodage auparavant — il est absent des `barcode-decode`
liste de symbologie), en réutilisant le détecteur de bande de codes-barres partagé pour sélectionner les lignes de numérisation. Il s'exécute dans `decode_barcode_frame` en tant que
solution de secours **après** l'échec du décodeur de grille, donc les téléchargements propres conservent le chemin rapide.

Deux gardes maintiennent les dossiers négatifs à **zéro** faux positifs — le lecteur est bien plus permissif que la grille
quantiseur, donc les deux étaient essentiels :

- **Zones silencieuses des deux côtés.** Le ZXing nécessite une zone silencieuse de fuite au moins aussi large que la protection d'extrémité (reflétant le
  zone calme de garde-démarrage existante). Sans cela, un `1:1:1` s'exécute _à l'intérieur_ d'un symbole sans rapport encadrant un faux "code-barres"
  qui, combiné à une somme de contrôle valide par coïncidence, décode - la source des 9 + 12 faux positifs initiaux sur
  `falsepositives*`.
- **Consensus sur plusieurs lignes pour les symbologies courtes.** Les EAN-8 / UPC-E à 8 chiffres sont sujets à une somme de contrôle aléatoire valide
  cadrage en désordre, ils ne sont donc acceptés que lorsque **≥ 2 lignes de balayage** décodent indépendamment la même valeur (un véritable
  le code-barres décode sur plusieurs lignes de sa hauteur de barre ; un coup de chance apparaît sur l'un d'entre eux). Le EAN-13 / UPC-A à 13 chiffres (12 chiffres de données
  plus le premier chiffre dérivé de la parité)
  sont beaucoup moins sujets et sont acceptés sur une seule rangée. Chaque valeur renvoyée est en outre validée par le symbole
  propre somme de contrôle mod-10.

**Résultat :** dans les dossiers UPC/EAN, la rotation 0 a fortement augmenté — par ex.
`ean13-3` **3 → 54**, `upca-2` **0 → 31**, `upce-2` **0 → 37**, `upca-5`
**13 → 26**, plus `ean13-1`, `ean8-1`, `upca-1`, `upce-1/3` et, comme la solution de secours s'exécute également sur le
cadres de redressement et de réessai, gains comparables à 90°/180°/270° (par exemple `upce-2` rot90 **0 → 35**). **Aucun** autre dossier
régressé et les dossiers négatifs (`falsepositives`, `falsepositives-2`, `unsupported`) restent à **zéro** faux
points positifs. Deux tests de régression basés sur un corpus dans
`code-scan/tests/pipeline.rs` verrouille les lectures de photos réelles UPC-E/EAN-13/EAN-8 et la garde propre contre les faux positifs, et le JS
smoke suite obtient des photos de caméra UPC-E + EAN-13 via les chemins de téléchargement et de streaming.

**Remarque — `img.png`.** La capture réelle de la racine de l'espace de travail (`real_world.rs`) est désormais _localisée_ proprement, mais elle code
l'exemple de générateur classique `01234567`
dont le chiffre de fin n'est **pas** un contrôle mod-10 valide (`0123456` → `01234565`). Un lecteur conforme aux spécifications - celui-ci, et
ZXing lui-même - rejette un code-barres qui échoue à sa propre somme de contrôle, de sorte que le pipeline ne renvoie aucune valeur _par conception_ ; que
le test reste `#[ignore]` comme documentation du rejet intentionnel (abandonner la protection de la somme de contrôle pour la lire serait
rouvrir les faux positifs que le gardien supprime).

**Prochaine itération 1D :** Extensions UPC/EAN **add-on** (`upcean-extension-*`, les suppléments à 2/5 chiffres) et les plus difficiles
les dossiers (`upca-6`, `ean13-5`) restent à la ligne de base 0 — le lecteur complémentaire et un localisateur plus puissant pour ces captures sont les
suivis correspondants.
