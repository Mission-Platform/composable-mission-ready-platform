# Migliori pratiche della piattaforma di missione

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> Fonte inglese: [docs/best-practices.md](../../best-practices.md)
> Lingua: Italiano (it)

Questo documento delinea i principi fondamentali, l'architettura e gli standard di codifica per il monorepo Mission Platform. Esso
funge da **Spiegazione** del motivo per cui seguiamo determinati modelli e da **Linea guida** per lo sviluppo quotidiano.

## Principi fondamentali

### Architettura componibile

Mission Platform segue un'architettura componibile e basata su pacchetti. Elementi costitutivi riutilizzabili (componenti dell'interfaccia utente,
componenti componibili, utilities) vivono `packages/`, mentre le applicazioni distribuibili vengono assemblate da questi blocchi in `apps/`.

### Disciplina della dipendenza

Per mantenere un monorepo gestibile, applichiamo un rigoroso flusso di dipendenza unidirezionale:

- **`apps`** → **`packages`** / **`vite-plugins`** / **`workers`**
- **`packages`** / **`vite-plugins`** / **`workers`** → **`configs`**
- **`apps`** → **`configs`** (Direttamente per la configurazione di strumenti/build)

**Regola:** Codice inserito `packages/` non deve **mai** importare da `apps/`. Ciò impedisce dipendenze circolari e garantisce
i pacchetti rimangono veramente riutilizzabili.

### Libro di fiabe come banco di lavoro

Quando si aggiungono o si modificano componenti in `packages/`, utilizza l'app Libro di fiabe (`apps/storybook`) come il tuo sviluppo primario
ambiente. IL `apps/storybook` app non contiene le storie stesse: è l'ambiente di aggregazione a farlo
scopre e rende le storie che convivono accanto alle loro componenti.

- Co-localizzare ciascuno `.stories.tsx` file con il suo componente all'interno della directory del pacchetto di quel componente (ad es.
  `packages/components/src/components/**/<component>/<component>.stories.tsx`), non sotto `apps/storybook`. Questo corrisponde
  la convenzione dentro [Progettazione di componenti atomici](atomic-component-design.md).
- Verificare il comportamento dei componenti attraverso Vue, React, Svelte, Solide componenti Web cambiando il file
  `STORYBOOK_FRAMEWORK` variabile d'ambiente. Ciascuna modalità deve consumare lo stesso inventario narrativo neutro; una scomparsa
  l'artefatto del framework è un errore del pacchetto/esportazione, non un motivo per filtrare quella storia.

L'intero ciclo di validazione statica è:

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

## Standard di sviluppo

### TypeScript Ovunque

Tutto il nuovo codice sorgente deve essere scritto TypeScript (`.ts`) O Vue SFC con `<script setup lang="ts">`.

- **Modalità rigorosa**: `strict: true` viene applicato ovunque `tsconfig.json` file.
- **Tipi espliciti**: fornisce tipi espliciti per tutte le API pubbliche, le funzioni esportate e i componenti componibili.
- **Evitare `any`**: utilizzare tipi precisi o generici. Se un tipo è veramente sconosciuto, usa `unknown` ed eseguire il restringimento del tipo.

### Componenti neutrali rispetto al contesto

Quando possibile, crea componenti dell'interfaccia utente utilizzando il file `@mission-platform/forge` dialetto. Ciò consente ai componenti di essere
compilato e utilizzato in Vue, React, Svelte, Solide componenti Web senza riscrivere la logica di base. Configura il
risolutore del consumatore con la corrispondenza `mp:vue`, `mp:react`, `mp:svelte`, `mp:solid`, O `mp:web-component` condizione.

### Modelli di reattività (Vue 3)

- Utilizza esclusivamente la **Composition API**.
- Preferisco `ref()` affinché la maggior parte degli Stati mantenga la coerenza.
- Estrai logica stateful complessa in **Composables** (`useXxx`).
- Assicurarsi che tutti gli effetti collaterali (osservatori, intervalli, ascoltatori di eventi) siano stati adeguatamente eliminati `onUnmounted`.

## Flusso di lavoro Monorepo

### Isolamento delle preoccupazioni

- **Nuovi componenti dell'interfaccia utente**: appartieni `packages/`.
- **Utilità condivise**: appartieni `packages/`.
- **Strumenti Lint/Format/Build**: appartengono le configurazioni condivise `configs/`.

### Linting e formattazione

Lo stile di codice coerente viene applicato tramite ESLint E Prettier.

- Correre `pnpm lint` per verificare eventuali violazioni.
- Correre `pnpm format:write` per risolvere automaticamente i problemi di formattazione.
- I messaggi di commit devono seguire la specifica **Commit convenzionali**.

## Ottimizzazione delle prestazioni

- **Suddivisione del codice**: utilizza la dinamica `import()` per funzionalità non critiche e librerie di grandi dimensioni.
- **Ottimizzazione delle risorse**: preferisci i formati di immagine moderni (WebP/AVIF) e assicurati che tutte le risorse statiche siano compresse.
- **Capacità di reattività**: utilizzare `shallowRef` per oggetti di grandi dimensioni che non richiedono una reattività profonda.

## Test e documentazione

- **Sviluppo basato sui test**: ogni nuova funzionalità o correzione di bug deve essere accompagnata da test unitari (`.spec.ts`).
- **Documentazione Diátaxis**: Documentazione scritta seguendo il framework Diátaxis (Tutorial, How-to, Reference,
  Spiegazione).
- **TSDoc**: utilizza TSDoc/JSDoc per tutti i metodi e le proprietà rivolti al pubblico per potenziare l'intelligenza IDE.

## Risorse correlate

- [Guida al test](testing.md)
- [Migliori pratiche quadro](framework-best-practices.md)
- [Struttura dell'area di lavoro](workspace-structure.md)
- [Risoluzione dei problemi](troubleshooting.md)
