# @mission-platform/email-sender

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/edge/workers/email-sender/docs/index.md: [packages/edge/workers/email-sender/docs/index.md](../../index.md)
> Langue: Français (fr)

Un Cloudflare Worker local uniquement qui accepte le HTML complété et l'envoie à
MailPit sur SMTP. Cet espace de travail est propriétaire du contrat `/api/email/send` et de son
Configuration du développement de MailPit.

## Utiliser localement

Le point de terminaison valide `{ to, recipientName, html }` et renvoie un JSON stable
résultat après la livraison. Démarrez MailPit, générez des liaisons Worker locales, puis exécutez
le Travailleur :

```bash
docker run --rm --name mission-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
pnpm --filter @mission-platform/email-sender types
pnpm --filter @mission-platform/email-sender dev -- --port 8787
```

Le point de terminaison SMTP par défaut est `127.0.0.1:1025`, avec l'interface utilisateur MailPit à
`http://localhost:8025`. Remplacer les variables Wrangler locales lors de l'utilisation d'un autre
hôte.

Ce travailleur est une vitrine locale et n'est pas un service de production de courrier. Jamais
placez les informations d'identification ou les secrets dans la configuration Wrangler suivie.

- [Guide de développement](guides/development.md)
- [`README.md`](../../../README.md)
