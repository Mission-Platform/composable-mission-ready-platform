# `@mission-platform/vcard`

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/vcard/docs/index.md: [packages/vcard/docs/index.md](../../index.md)
> Langue: Français (fr)

API de données RFC 6350 vCard et RFC 5545 iCalendar partagées pour Mission Platform.

Le package fournit une analyse et une écriture sans perte des composants/propriétés
`readICalendar`/`writeICalendar` et `readVCard`/`writeVCard`, plus Forge
moteurs de rendu nommés `ForgeVCard` et `ForgeICalendar`. `ForgeICalendar` accepte le
résultat normalisé de `calendarEvents(readICalendar(source))` afin que le résultat généré
Les composants du framework restent indépendants des modules d'exécution de l'analyseur.

Voir `llms.txt` pour l'API publique et des exemples d'utilisation.
