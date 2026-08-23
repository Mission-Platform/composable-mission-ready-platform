# Sviluppo di applicazioni

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/application-development.md: [docs/application-development.md](../../application-development.md)
> Lingua: Italiano (it)

Questa guida pratica spiega come eseguire, testare e distribuire le applicazioni in `apps/`. Le applicazioni sono riutilizzabili
pacchetti; i componenti condivisi, i componenti componibili, le utilità e la configurazione appartengono al proprio spazio di lavoro invece di esserlo
copiato in un'app.

## Scegli un'applicazione

| Applicazione | Sviluppo locale | Costruisci | Distribuzione |
|:---|:---|:---|:---|
| `@mission-platform/docs` | `pnpm --filter @mission-platform/docs dev` | `pnpm --filter @mission-platform/docs build` | Anteprima o distribuzione tramite il relativo lavoratore di hosting |
| `@mission-platform/website` | `pnpm --filter @mission-platform/website dev` | `pnpm --filter @mission-platform/website build` | `pnpm --filter @mission-platform/website deploy:staging` |
| `@mission-platform/my-care-notes` | `pnpm --filter @mission-platform/my-care-notes dev` | `pnpm --filter @mission-platform/my-care-notes build` | `pnpm --filter @mission-platform/my-care-notes deploy:staging` |
| `@mission-platform/service-monitor` | `pnpm --filter @mission-platform/service-monitor dev` | `pnpm --filter @mission-platform/service-monitor build` | `pnpm --filter @mission-platform/service-monitor deploy:staging` |
| `@mission-platform/storybook` | `pnpm --filter @mission-platform/storybook dev` | `pnpm --filter @mission-platform/storybook build` | Utilizza il flusso di lavoro configurato per Libro di fiabe/Cromatico |

Il pacchetto dell'applicazione possiede il suo file Vite O Wrangler configurazione. Non correre `wrangler deploy` da un lavoratore riutilizzabile
pacchetto a meno che quel pacchetto non abbia il proprio `wrangler.jsonc`.

## Sviluppare un cambiamento

1. Avviare l'applicazione di destinazione con il relativo pacchetto `dev` sceneggiatura.
2. Apporta modifiche riutilizzabili in `packages/` e la composizione specifica dell'app cambia in `apps/<name>/`.
3. Costruisci l'applicazione modificata e le sue dipendenze:

```bash
   pnpm exec turbo run build --filter @mission-platform/<app>...
   ```

4. Esegui test, lanugine, controlli di stile e formattazione per l'area di lavoro interessata:

```bash
   pnpm exec turbo run test lint lint:style format --filter @mission-platform/<app>
   ```

Per una modifica del pacchetto condiviso, sostituire `<app>` con il nome del pacchetto e l'uso `...` quando hai bisogno di spazi di lavoro dipendenti
incluso nel grafico di costruzione.

## Documentazione statica e build di siti Web

I documenti e le applicazioni del sito Web utilizzano `vite-ssg`. Una build di produzione genera percorsi statici dal contenuto di origine e
cataloghi locali. Controlla l'output generato con quello del pacchetto `preview` sceneggiatura:

```bash
pnpm --filter @mission-platform/docs build
pnpm --filter @mission-platform/docs preview

pnpm --filter @mission-platform/website build
pnpm --filter @mission-platform/website preview
```

Conserva la documentazione Markdown sotto `docs/` e messaggi del sito Web nel catalogo locale di proprietà. Non aggiungere un secondo
copia in fase di rendering di entrambe le origini.

## Sviluppo e distribuzione di Cloudflare

Le applicazioni con a `wrangler.jsonc` esporre comandi sensibili all'ambiente:

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev

pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

Utilizzo `wrangler secret put` per i segreti. Mantieni i collegamenti e le impostazioni predefinite non segrete `wrangler.jsonc`e verificare il
ambiente selezionato prima della distribuzione.

## Guide correlate

- [Configurazione dello sviluppo](development-setup.md)
- [Struttura dell'area di lavoro](workspace-structure.md)
- [Costruisci sistema](build-system.md)
- [Configurazione del lavoratore](configs/workers-config.md)
- [Test](testing.md)
