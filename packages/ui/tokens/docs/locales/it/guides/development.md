# Sviluppare il pacchetto token

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/ui/tokens/docs/guides/development.md: [packages/ui/tokens/docs/guides/development.md](../../../guides/development.md)
> Lingua: Italiano (it)

## Installa e verifica

Esegui i controlli del pacchetto dalla root del repository:

```bash
pnpm install
pnpm --filter @mission-platform/tokens lint
pnpm --filter @mission-platform/tokens lint:style
pnpm --filter @mission-platform/tokens build
```

La build produce JavaScript e l'output della dichiarazione in `dist/`. Generato
Le origini SCSS e TypeScript in `src/generated/` sono artefatti derivati e
deve rimanere deterministico.

## Cambia un gettone

Modifica il JSON di origine in `tokens/` e mantieni stabile il suo percorso DTCG a meno che il file
il cambiamento è intenzionale e documentato. I contratti componenti vivono sotto
`tokens/component/<atomic-level>/`; le origini dei componenti non devono duplicarsi
percorsi di token condivisi. Utilizza gli script di generazione dei token esistenti ed esaminali entrambi
Output SCSS e TypeScript prima della pubblicazione.

Il pacchetto è neutro dal punto di vista strutturale. Il comportamento del tema è selezionato dal consumatore
foglio di stile attraverso i punti di ingresso SCSS esportati; questo pacchetto non possiede
stato del tema dell'applicazione o markup del componente.
