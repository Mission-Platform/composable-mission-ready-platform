# @mission-platform/storybook-framework

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> configs/storybook-framework/docs/index.md: [configs/storybook-framework/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Struttura del libro di fiabe selezionata dall'ambiente preimpostata per Mission Platform.

## Installare e utilizzare

Aggiungi il pacchetto all'area di lavoro Storybook e fai riferimento ad esso
`.storybook/main.ts` o la corrispondente configurazione Storybook. Seleziona il
quadro attraverso le condizioni supportate dello spazio di lavoro; non codificare a
adattatore framework nei pacchetti di componenti condivisi.

## Contribuire

Correre `pnpm --filter @mission-platform/storybook-framework lint` e il
Verifiche della costruzione del libro di fiabe. Mantieni questo pacchetto incentrato sulla selezione del framework e
impostazioni predefinite condivise di Storybook; le storie componenti appartengono `apps/storybook`.
