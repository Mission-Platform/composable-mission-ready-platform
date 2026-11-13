# Script di utilità condivisa

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/configs/scripts-config.md: [docs/configs/scripts-config.md](../../../configs/scripts-config.md)
> Lingua: Italiano (it)

Questa guida rimane intenzionalmente nel livello di documentazione del progetto: `scripts/`
è un pacchetto di area di lavoro privata contenente l'orchestrazione del repository anziché un file
biblioteca pubblicabile.
I comandi specifici del pacchetto e dell'applicazione rimangono documentati accanto al loro file
possedere uno spazio di lavoro.

La Mission Platform mantiene una serie di script di utilità condivisa nella root
Directory `scripts/`. Gli script dei loro pacchetti sono registrati come attività Turbo, mentre
la radice `package.json` espone comodi wrapper che delegano a Turbo.

## Panoramica

Questi script automatizzano le attività monorepo comuni, come la configurazione dello sviluppo locale e la verifica della build. Traduzione
l'estrazione è definita da ciascuna app o pacchetto e orchestrata dalla root del repository con Turborepo.

## Script disponibili

### Turbo famiglie di attività

Utilizzare i wrapper root per le utilità del repository riportate di seguito. Ogni comando è a
attività separata, in modo che Turbo possa eseguire l'hashing e pianificarlo in modo indipendente:

| Comando | Scopo | Politica della cache |
| :----------------------------------- | :---------------------------------------------------------------- | :---------------------------------------------------------- |
| `pnpm validate` | Eseguire il controllo statico delle proprietà del componente autonomo tramite Turbo. | L'attività viene memorizzata nella cache in modo indipendente.                           |
| `pnpm docs:generate` | Genera documentazione di riferimento per pacchetti ed estensioni.           | I file di riferimento generati vengono memorizzati nella cache.                       |
| `pnpm validate:exports` | Verifica le mappe di esportazione dei pacchetti e le destinazioni create.                     | Memorizzabile nella cache quando i suoi input rimangono invariati.                    |
| `pnpm validate:component-properties` | Controlla le dichiarazioni delle proprietà dei componenti rispetto agli stili di origine.      | Memorizzabile nella cache e senza output.                                  |
| `pnpm validate:inventory` | Produrre l'inventario di convalida del runtime.                         | Artefatti memorizzabili nella cache in `.artifacts/runtime-validation/`. |
| `pnpm validate:framework` | Convalidare la copertura del runtime del framework.                              | Artefatti memorizzabili nella cache in `.artifacts/runtime-validation/`. |
| `pnpm validate:app` | Convalidare la copertura del runtime dell'applicazione.                            | Artefatti memorizzabili nella cache in `.artifacts/runtime-validation/`. |
| `pnpm validate:target` | Convalida le destinazioni di Storybook configurate.                            | Artefatti memorizzabili nella cache in `.artifacts/runtime-validation/`. |
| `pnpm validate:runtime` | Esegui la suite completa di convalida del runtime.                            | Non memorizzato nella cache perché avvia processi di runtime esterni.    |
| `pnpm visual:parity` | Confronta l'output renderizzato di Storybook tra framework.              | Non memorizzato nella cache perché avvia i server di sviluppo.           |
| `pnpm test:runtime-validation` | Eseguire gli unit test mirati di convalida del runtime.                    | Memorizzabile nella cache in base agli input dell'attività di test.                |

Gli input dell'attività di utilità sono dichiarati in `turbo.json`; utilizzo degli input a livello di repository
`$TURBO_ROOT| `pnpm test:runtime-validation` | Eseguire gli unit test mirati di convalida del runtime.                    | Memorizzabile nella cache in base agli input dell'attività di test.                |

Gli input dell'attività di utilità sono dichiarati in `turbo.json`; utilizzo degli input a livello di repository
 in modo che rimangano corretti quando l'attività viene eseguita da `scripts/`
spazio di lavoro. Il runtime generato e gli artefatti visivi sono scritti di seguito
`.artifacts/` e non vengono trattati come input sorgente.

`pnpm validate:exports` è intenzionalmente un gate post-compilazione separato perché
controlla i file nelle directory del pacchetto `dist/`. Eseguilo dopo `pnpm build`, come
Il lavoro dei cancelli statici cromatici lo fa.
 `$TURBO_ROOT$`
### Estrazione i18n (`i18n:extract`)

Ogni app o pacchetto che possiede traduzioni fornisce uno script `i18n:extract` e `i18next.config.ts`. Il comando scrive
bundle di spazi dei nomi nella directory `locales/<locale>/` di ogni spazio di lavoro. Esegui l'estrazione per tutte le aree di lavoro configurate da
la radice del repository:

```bash
pnpm i18n:extract
```

### Generazione certificato di sviluppo (`generate-dev-cert.ts`)

Genera certificati SSL/TLS locali per lo sviluppo HTTPS. Ciò è utile per testare funzionalità che richiedono un file secure
contesto (ad esempio, accesso alla telecamera tramite `@mission-platform/code-scanner`).

```bash
pnpm exec tsx scripts/generate-dev-cert.ts
```

### Verifica della risoluzione del quadro (`verify-framework-resolution.mjs`)

Verifica che le esportazioni del pacchetto `@mission-platform/*` si risolvano correttamente nella build del framework prevista (Vue, React, ecc.)
in base alle condizioni di esportazione dell’ambiente.

```bash
node scripts/verify-framework-resolution.mjs
```

### Generazione della documentazione (`docs:generate`)

La generazione della documentazione è un'attività Turbo di proprietà di `@mission-platform/scripts`.
L'applicazione della documentazione dipende esplicitamente da tale attività, quindi development e build
i comandi non avviano una build Turbo nidificata.

## Metodi di esecuzione

### Tramite Gestione pacchetti

Le utilità utilizzate di frequente sono disponibili come script `pnpm` supportati da Turbo nella
radice `package.json`:

```bash
pnpm run <script-name>
```

Per una chiamata con ambito pacchetto, utilizzare direttamente Turbo:

```bash
pnpm exec turbo run validate:exports --filter=@mission-platform/scripts
```

### Esecuzione diretta

I singoli script TypeScript possono essere eseguiti utilizzando `tsx` o `node --experimental-strip-types`:

```bash
pnpm exec tsx scripts/<filename>.ts
```

## Linee guida per i contributi

Quando aggiungi un nuovo script condiviso:

- Inseriscilo nella directory `scripts/`.
- Utilizzare TypeScript ove possibile.
- Se lo script dipende da pacchetti esterni, aggiungerli all'`package.json` dell'area di lavoro proprietaria.
- Documentare lo scopo e l'utilizzo dello script in questo file.
- Aggiungere una voce corrispondente nella root `package.json` se si tratta di un'utilità utilizzata di frequente.
