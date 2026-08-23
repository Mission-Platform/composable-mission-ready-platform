# Panoramica della piattaforma di missione

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/overview.md: [docs/overview.md](../../overview.md)
> Lingua: Italiano (it)

Mission Platform è una piattaforma di componenti componibile, basata su pacchetti e indipendente dal framework, progettata per la creazione
applicazioni pronte per la produzione con elementi costitutivi riutilizzabili. Sfrutta una moderna architettura monorepo per fornire a
ambiente di sviluppo altamente efficiente per ecosistemi complessi e multi-applicazione.

## La filosofia componibile

Fondamentalmente, Mission Platform si basa sul principio della **composizione anziché ereditarietà**. Invece di fornire a
quadro monolitico che detta la struttura dell'applicazione, la piattaforma offre una suite piccola, mirata e altamente
pacchetti interoperabili.

### Blocchi componibili

Le applicazioni vengono assemblate da pacchetti condivisi, garantendo una logica comune, dai componenti dell'interfaccia utente all'internazionalizzazione
e il routing: viene creato una volta e riutilizzato ovunque. Questo approccio riduce la duplicazione, semplifica la manutenzione e
garantisce un'esperienza utente coerente nell'intera suite di prodotti.

### Multi-Framework in base al design

Mission Platform introduce un paradigma di sviluppo neutrale rispetto al contesto. Utilizzando il dialetto JSX `@mission-platform/forge`,
gli sviluppatori possono creare componenti una volta e compilarli in output nativi per Vue 3, React, Solid, Svelte e Web
Componenti. Ciò rende la base di codice a prova di futuro e consente un'integrazione perfetta in diversi ambienti frontend.

### Fondazione sicura per i tipi

L'intera piattaforma è stata creata in **TypeScript**, fornendo un'esperienza di sviluppo solida e autodocumentata. Esplicito
la digitazione su tutte le API pubbliche garantisce che gli errori vengano rilevati in fase di compilazione, aumentando significativamente lo sviluppo
velocità e qualità del codice.

## Caratteristiche principali

| Caratteristica | Descrizione |
|:----------------------|:---------------------------------------------------------------------------------------------------------------------------------------|
| **Forgia JSX Runtime** | Un dialetto JSX indipendente dal framework: crea una volta e crea per Vue 3, React, Svelte, Solid e componenti Web con zero sovraccarico di runtime. |
| **Libreria componenti** | Un set completo di layout, tipografia e componenti interattivi creati una volta per più framework.                           |
| **Gettoni di design** | Un sistema di token conforme a DTCG che genera artefatti SCSS e TypeScript per temi coerenti.                                     |
| **Routing agnostico** | Un sistema di routing indipendente dai tipi che funziona indipendentemente dal framework dell'interfaccia utente.                                                               |
| **I18n universale** | Un wrapper di internazionalizzazione indipendente dal framework basato su i18next con adattatori Vue e React dedicati.                              |
| **Utilità Wasm** | Utilità ad alte prestazioni per la scansione di codici a barre, il controllo ortografico e altro ancora, basate su WebAssembly.                                     |

## Pila tecnologica

Mission Platform è costruita su uno stack moderno e ad alte prestazioni:

- **Forge JSX (`@mission-platform/forge`)**: il framework dell'interfaccia utente principale: un runtime JSX indipendente dal framework in cui tutti
  vengono creati i componenti condivisi (tutto tranne le app).
- **Vue 3**: il framework con cui sono create le applicazioni in `apps/` e uno dei numerosi target di rendering nativi per
  Forgiare componenti.
- **TypeScript**: lo standard per tutto il codice sorgente.
- **Vite**: lo strumento di creazione che supporta un HMR veloce e pacchetti di produzione ottimizzati.
- **pnpm Aree di lavoro**: gestione efficiente delle dipendenze con file di blocco condivisi.
- **Turborepo**: orchestrazione e memorizzazione nella cache delle attività ad alte prestazioni.
- **Worker/Pagine Cloudflare**: il target di distribuzione principale per applicazioni e API.
- **Storybook**: l'ambiente di lavoro per lo sviluppo dei componenti e i test visivi.

## Struttura dell'ecosistema

Il repository è organizzato in diverse aree distinte:

- **`apps/`**: applicazioni distribuibili (ad esempio, `my-care-notes`, `website`) che compongono i pacchetti in prodotti.
- **`packages/`**: gli elementi costitutivi principali, inclusi `@mission-platform/components`, `@mission-platform/router` e
  `@mission-platform/i18n`.
- **`configs/`**: configurazioni condivise per ESLint, Prettier, TypeScript e Vite.
- **`vite-plugins/`**: strumenti di build personalizzati per token di progettazione, compilazione Forge e SEO.
- **`workers/`**: Cloudflare Worker che forniscono logica di backend e funzionalità di servizio SPA.

## Passaggi successivi

Per iniziare a sviluppare sulla Mission Platform, fai riferimento alle seguenti guide:

- **[Configurazione dello sviluppo](development-setup.md)**: prepara il tuo ambiente e installa le dipendenze.
- **[Architettura](architecture.md)**: approfondimento sui principi di progettazione della piattaforma e sul flusso delle dipendenze.
- **[Struttura dell'area di lavoro](workspace-structure.md)**: comprendere il layout della directory e le convenzioni dei pacchetti.
- **[Test](testing.md)**: informazioni sulle nostre strategie e strumenti di test.
