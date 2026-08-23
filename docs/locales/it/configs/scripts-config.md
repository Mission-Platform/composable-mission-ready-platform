# Script di utilità condivisa

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/configs/scripts-config.md: [docs/configs/scripts-config.md](../../../configs/scripts-config.md)
> Lingua: Italiano (it)

Questa guida rimane intenzionalmente nel livello della documentazione del progetto: `scripts/`
contiene l'orchestrazione del repository anziché un pacchetto di area di lavoro pubblicabile.
I comandi specifici del pacchetto e dell'applicazione rimangono documentati accanto al loro file
possedere uno spazio di lavoro.

La Mission Platform mantiene una serie di script di utilità condivisa nella root
`scripts/` directory, gestita dagli strumenti dell'area di lavoro root.

## Panoramica

Questi script automatizzano le attività monorepo comuni, come la configurazione dello sviluppo locale e la verifica della build. Traduzione
l'estrazione è definita da ciascuna app o pacchetto e orchestrata dalla root del repository con Turborepo.

## Script disponibili

### Estrazione i18n (`i18n:extract`)

Ogni app o pacchetto che possiede traduzioni fornisce un file `i18n:extract` sceneggiatura e `i18next.config.ts`. Il comando scrive
bundle di spazi dei nomi sotto ogni area di lavoro `locales/<locale>/` directory. Esegui l'estrazione per tutte le aree di lavoro configurate da
la radice del repository:

```bash
pnpm i18n:extract
```

### Generazione del certificato di sviluppo (`generate-dev-cert.ts`)

Genera certificati SSL/TLS locali per lo sviluppo HTTPS. Ciò è utile per testare funzionalità che richiedono un file secure
contesto (ad esempio, accesso alla telecamera tramite `@mission-platform/code-scanner`).

```bash
pnpm exec tsx scripts/generate-dev-cert.ts
```

### Verifica della risoluzione quadro (`verify-framework-resolution.mjs`)

Lo verifica `@mission-platform/*` le esportazioni di pacchetti si risolvono correttamente nella build del framework prevista (Vue, React, ecc.)
in base alle condizioni di esportazione dell’ambiente.

```bash
node scripts/verify-framework-resolution.mjs
```

## Metodi di esecuzione

### Tramite Gestione pacchetti

La maggior parte degli script sono disponibili come `pnpm` script nella radice `package.json`:

```bash
pnpm run <script-name>
```

### Esecuzione diretta

Individuale TypeScript gli script possono essere eseguiti utilizzando `tsx` O `node --experimental-strip-types`:

```bash
pnpm exec tsx scripts/<filename>.ts
```

## Linee guida per i contributi

Quando aggiungi un nuovo script condiviso:

- Mettilo nel `scripts/` directory.
- Utilizzo TypeScript dove possibile.
- Se lo script dipende da pacchetti esterni, aggiungili allo spazio di lavoro proprietario `package.json`.
- Documentare lo scopo e l'utilizzo dello script in questo file.
- Aggiungi una voce corrispondente nella radice `package.json` se si tratta di un'utilità utilizzata di frequente.
