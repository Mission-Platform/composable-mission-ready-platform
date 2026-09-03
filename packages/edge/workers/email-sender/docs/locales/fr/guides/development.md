# Développer le travailleur de l'expéditeur d'e-mails

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/edge/workers/email-sender/docs/guides/development.md: [packages/edge/workers/email-sender/docs/guides/development.md](../../../guides/development.md)
> Langue: Français (fr)

Exécutez les vérifications des packages à partir de la racine du référentiel :

```bash
pnpm --filter @mission-platform/email-sender build:check
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/email-sender build
```

Exécutez `pnpm --filter @mission-platform/email-sender types` après avoir modifié
liaisons. Ajoutez des tests de validation des points de terminaison, d'échec SMTP et de réponse stable pour
modifications du contrat. Gardez le gestionnaire Worker compatible avec Cloudflare et conservez
Comportement de MailPit uniquement derrière la configuration du développement local.
