# Forgia il ponte del repository Figma

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/compiler/figma/forge-figma-bridge/docs/index.md: [packages/compiler/figma/forge-figma-bridge/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Il bridge accetta un `ForgeRepositoryExportRequest` revisionato su un `POST /export` autenticato e scrive il bundle in una delle radici del repository esplicitamente configurate. Configura root con l'opzione `--root <id>=<absolute-path>` della CLI.

Ogni processo del server crea un nuovo token di autenticazione. La CLI stampa il token all'avvio; i chiamanti devono inviarlo come `Authorization: Bearer <token>` e inviare l'origine predefinita `https://www.figma.com`. L'origine può essere modificata per un'integrazione locale configurata esplicitamente con l'opzione server `allowedOrigin`. Le richieste provenienti da altre origini e le richieste senza token vengono rifiutate prima che il bundle venga letto o scritto.
