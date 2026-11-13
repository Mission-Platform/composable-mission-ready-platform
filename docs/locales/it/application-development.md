# Sviluppo di applicazioni

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/application-development.md: [docs/application-development.md](../../application-development.md)
> Lingua: Italiano (it)

Questa guida pratica spiega come eseguire, testare e distribuire le applicazioni in `apps/`. Le applicazioni sono riutilizzabili
pacchetti; i componenti condivisi, i componenti componibili, le utilità e la configurazione appartengono al proprio spazio di lavoro invece di esserlo
copiato in un'app.

## Scegli un'applicazione

| Applicazione | Sviluppo locale | Costruisci | Distribuzione |
| :---------------------------------- | :---------------------------------------------------- | :------------------------------------------------------ | :--------------------------------------------------------------- |
| `@mission-platform/docs` | `pnpm --filter @mission-platform/docs dev` | `pnpm --filter @mission-platform/docs build` | Visualizza l'anteprima o distribuisci tramite il relativo lavoratore di hosting |
| `@mission-platform/website` | `pnpm --filter @mission-platform/website dev` | `pnpm --filter @mission-platform/website build` | `pnpm --filter @mission-platform/website deploy:staging` |
| `@mission-platform/my-care-notes` | `pnpm --filter @mission-platform/my-care-notes dev` | `pnpm --filter @mission-platform/my-care-notes build` | `pnpm --filter @mission-platform/my-care-notes deploy:staging` |
| `@mission-platform/service-monitor` | `pnpm --filter @mission-platform/service-monitor dev` | `pnpm --filter @mission-platform/service-monitor build` | `pnpm --filter @mission-platform/service-monitor deploy:staging` |
| `@mission-platform/storybook` | `pnpm --filter @mission-platform/storybook dev` | `pnpm --filter @mission-platform/storybook build` | Utilizza il flusso di lavoro configurato per Libro di fiabe/Cromatico |

Il pacchetto dell'applicazione possiede la propria configurazione Vite o Wrangler. Non eseguire `wrangler deploy` da un ruolo di lavoro riutilizzabile
pacchetto a meno che il pacchetto non abbia il proprio `wrangler.jsonc`.

## Sviluppare un cambiamento

1. Avviare l'applicazione di destinazione con il relativo script del pacchetto `dev`.
2. Apportare modifiche riutilizzabili in `packages/` e modifiche alla composizione specifica dell'app in `apps/<name>/`.
3. Costruisci l'applicazione modificata e le sue dipendenze:

   ```bash
   pnpm exec turbo run build --filter @mission-platform/<app>...
   ```

4. Esegui test, lanugine, controlli di stile e formattazione per l'area di lavoro interessata:

   ```bash
   pnpm exec turbo run test lint lint:style format --filter @mission-platform/<app>
   ```

Per una modifica del pacchetto condiviso, sostituire `<app>` con il nome del pacchetto e utilizzare `...` quando sono necessarie aree di lavoro dipendenti
incluso nel grafico di costruzione.

## Documentazione statica e build di siti Web

I documenti e le applicazioni del sito Web utilizzano `vite-ssg`. Una build di produzione genera percorsi statici dal contenuto di origine e
cataloghi locali. Controlla l'output generato con lo script `preview` del pacchetto:

```bash
pnpm --filter @mission-platform/docs build
pnpm --filter @mission-platform/docs preview

pnpm --filter @mission-platform/website build
pnpm --filter @mission-platform/website preview
```

Conserva la documentazione Markdown in `docs/` e i messaggi del sito Web nel catalogo locale di proprietà. Non aggiungere un secondo
copia in fase di rendering di entrambe le origini.

## Sviluppo e distribuzione di Cloudflare

Le applicazioni con `wrangler.jsonc` espongono comandi compatibili con l'ambiente:

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev

pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

Utilizzare `wrangler secret put` per i segreti. Mantieni le associazioni e le impostazioni predefinite non segrete in `wrangler.jsonc` e verifica il file
ambiente selezionato prima della distribuzione.

## Guide correlate

- [Impostazione sviluppo](development-setup.md)
- [Struttura dell'area di lavoro](workspace-structure.md)
- [Crea sistema](build-system.md)
- [Configurazione lavoratore](configs/workers-config.md)
- [Test](testing.md)
