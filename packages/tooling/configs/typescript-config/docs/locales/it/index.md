# @mission-platform/typescript-config

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/tooling/configs/typescript-config/docs/index.md: [packages/tooling/configs/typescript-config/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Preimpostazioni TypeScript condivise per ogni area di lavoro di Mission Platform.

## Installare e utilizzare

```bash
pnpm add --save-dev @mission-platform/typescript-config
```

Estendi la preimpostazione corrispondente da `tsconfig.json`: utilizza `app` per le app Vue,
`react` per le app React, `library` per le dichiarazioni dei pacchetti, `node` per gli strumenti,
e `test` per le specifiche Vitest. Anche i consumatori del framework dovrebbero utilizzare la corrispondenza
`framework-<name>` preimpostazione condizione personalizzata. Vedere il pacchetto README per
tabella preimpostata completa ed esempi.

## Contribuire

Mantieni i flag del compilatore condiviso nei preset. Corri
`pnpm --filter @mission-platform/typescript-config build:check` e formato
controlli dopo averne cambiato uno.
