# Stratégie de modèle et de coûts – Effort de couverture complète du corpus ZXING

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/code-scanner/docs/model-cost-strategy.md: [packages/code-scanner/docs/model-cost-strategy.md](../../model-cost-strategy.md)
> Langue: Français (fr)

Ce document capture la **matrice de hiérarchisation des modèles** demandée pour le travail du corpus boîte noire ZXING (« utiliser des agents de
différents modèles pour déterminer la meilleure façon d'y parvenir au coût le plus efficace"). Il enregistre quel niveau de modèle est le meilleur
adapté à chaque étape de livraison, afin que partout où un mécanisme de délégation existe, le travail puisse être acheminé vers le moins cher
niveau compétent - et lorsqu'un seul agent effectue le travail, il guide où le plus d'efforts (et le modèle le plus performant)
devrait être dépensé.

## Définitions de niveau

- **Niveau A (le plus performant/le plus performant)** — nouveau raisonnement par vision par ordinateur et décodage exigeant de nombreuses spécifications : les nouveaux localisateurs (MaxiCode
  grille hexagonale + bullseye, regroupement de lignes PDF417, assemblage de lignes empilées GS1 DataBar) et Reed – Solomon /
  mathématiques de correction d'erreurs (GF (929) pour PDF417, GF (64) pour MaxiCode, la combinatoire RSS). Ce sont les parties les plus
  il est probable que l'on se trompe de manière subtile et il est plus difficile de se remettre d'une mauvaise première ébauche.
- **Tier B (mid)** — portage bien spécifié à partir de la référence ZXING : tables de symbologie, encodeurs, aller-retour générés
  les tests, la logique du faisceau et la généralisation du chargeur PNG. La forme de la réponse est connue ; le travail est soigné
  transcription et câblage.
- **Niveau C (bon marché/mécanique)** — copie en masse, fichiers d'attribution, échafaudage de base, documents et modèle de câblage
  (balises de format, `FORMAT_NAMES`, l'union `ScanFormat`).

## Cartographie étape → niveau

| Scène | Travail | Niveau |
| ---------------------------------- | ------------------------------------------------------- | ---- |
| 1 Corpus vendeur + chargeur + harnais | copie/attribution (C), logique chargeur + harnais (B) | C → B |
| 2 Augmenter le taux de lecture des formats pris en charge | réglage du localisateur + nouvelle tentative de chemins | UNE→B |
| 3 Famille GS1 DataBar | tables/encodeurs (B), localisateur RSS-14 + RS (A) | A/B |
| 4 PDF417 | tables/encodeur (B), localisateur de balayage de lignes + GF(929) EC (A) | A/B |
| 5 MaxiCode | localisateur de grille hexagonale + GF(64) RS (A), tableaux (B) | A/B |
| 6 Connexion + JS + docs | passe-partout/docs + câblage (C), reconstruction wasm + fumée (B) | C → B |

## Principe de coût

Maximisez la part Tier-C/Tier-B — le portage mécanique (tables, encodeurs, tests aller-retour, câblage) constitue l'essentiel de
le travail sur le nouveau format - et réserver le budget de niveau A pour les trois localisateurs véritablement nouveaux et leur correction d'erreurs
les mathématiques, où les erreurs d'un modèle plus faible sont coûteuses à détecter et à corriger. Un pic court peut comparer un modèle moins cher sur
un port de décodeur avant de valider le niveau pour le reste.

## Comment ça s'est passé

- **Étape 6** (cette étape) est le cas le plus clair de niveau C → B : extension
  L'union `FORMAT_NAMES` et `ScanFormat` est mécanique (C) ; reconstruire le wasm et écrire la fumée de téléchargement/flux
  la suite avec un petit lecteur PNG est un travail de niveau intermédiaire bien spécifié (B). Aucun raisonnement de niveau A n'était nécessaire une fois que le natif
  des décodeurs (étapes 3 à 5) étaient en place.
- **Étapes 3 à 5** chacune divisée proprement : les tables/encodeurs ZXING et les tests aller-retour étaient une transcription de niveau B, tandis que les
  les localisateurs et Reed – Solomon (GF (929), GF (64), la combinatoire RSS) constituaient le noyau de niveau A – cohérent avec la matrice
  ci-dessus.

> Aucun outil de délégation d'agent personnalisé n'était disponible lors de la mise en œuvre, donc un
> un seul agent a effectué le travail tout en dépensant des efforts selon cette matrice. Le
> la matrice reste le guide pour toute réexécution future où la délégation à plusieurs
> Des niveaux de modèles sont possibles.
