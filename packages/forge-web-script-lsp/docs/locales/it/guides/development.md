# Sviluppare il server del linguaggio Forge Web Script

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/forge-web-script-lsp/docs/guides/development.md: [packages/forge-web-script-lsp/docs/guides/development.md](../../../guides/development.md)
> Lingua: Italiano (it)

## Installa e verifica

Esegui i controlli mirati del pacchetto dalla root del repository:

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp test
```

Costruisci con `pnpm --filter @mission-platform/forge-web-script-lsp build`. Il
il risultato viene emesso in `dist/`; l'output locale non è un artefatto di origine.

## Modifiche al protocollo

Mantieni diagnostica, intervalli UTF-16, simboli, completamento, passaggio del mouse e token semantico
comportamento in linea con il pacchetto di servizi linguistici. Aggiungi una regressione del protocollo
apparecchio per ogni nuova richiesta o capacità. L'LSP attualmente non fornisce
go-to-definition, riferimenti, ridenominazione, formattazione, azioni codice, cross-file
importazioni di lingue o un trasporto ospitato da browser.

Il server è basato su stdio e solo Node. L'integrazione dell'editor del browser appartiene a
l'adattatore locale del pacchetto di servizi linguistici anziché questo server.
