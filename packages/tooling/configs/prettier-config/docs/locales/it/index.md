# @mission-platform/prettier-config

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/tooling/configs/prettier-config/docs/index.md: [packages/tooling/configs/prettier-config/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Impostazioni predefinite di formattazione del repository condivise da pacchetti e applicazioni.

## Installare e utilizzare

```bash
pnpm add --save-dev @mission-platform/prettier-config
```

Esporta la configurazione condivisa dallo spazio di lavoro `prettier.config.js`.
Usa le sostituzioni locali con parsimonia in modo che Markdown, TypeScript, Vuee configurazione
i file rimangono coerenti nel monorepo.

## Contribuire

Correre `pnpm --filter @mission-platform/prettier-config format` dopo aver cambiato il
configurazione. Le modifiche dovrebbero applicarsi in modo coerente a ogni area di lavoro che utilizza
il pacchetto.
