# Migliori pratiche della piattaforma di missione

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/best-practices.md: [docs/best-practices.md](../../best-practices.md)
> Lingua: Italiano (it)

Questo documento delinea i principi fondamentali, l'architettura e gli standard di codifica per il monorepo Mission Platform. Esso
funge da **Spiegazione** del motivo per cui seguiamo determinati modelli e da **Linea guida** per lo sviluppo quotidiano.

## Principi fondamentali

### Architettura componibile

Mission Platform segue un'architettura componibile e basata su pacchetti. Elementi costitutivi riutilizzabili (componenti dell'interfaccia utente,
componenti componibili, utilità) risiedono in `packages/`, mentre le applicazioni distribuibili vengono assemblate da questi blocchi in `apps/`.

### Disciplina della dipendenza

Per mantenere un monorepo gestibile, applichiamo un rigoroso flusso di dipendenza unidirezionale:

- **`apps`** → **`packages`**
- **`packages`** → pacchetti di domini di livello inferiore come **`core`**, **`tooling`** e **`compiler`**

**Regola:** il codice in `packages/` non deve **mai** essere importato da `apps/`. Ciò impedisce dipendenze circolari e garantisce
i pacchetti rimangono veramente riutilizzabili.

### Libro di fiabe come banco di lavoro

Quando aggiungi o modifichi componenti in `packages/`, utilizza l'app Storybook (`apps/storybook`) come sviluppo principale
ambiente. L'app `apps/storybook` non contiene le storie in sé: è l'ambiente di aggregazione a farlo
scopre e rende le storie che convivono accanto alle loro componenti.

- Collocare ciascun file `.stories.tsx` con il relativo componente all'interno della directory del pacchetto di quel componente (ad es.
  `packages/ui/components/src/components/**/<component>/<component>.stories.tsx`), non sotto `apps/storybook`. Questo corrisponde
  la convenzione in [Progettazione di componenti atomici](atomic-component-design.md).
- Verificare il comportamento dei componenti su Vue, React, Svelte, Solid e Componenti Web cambiando il
  `STORYBOOK_FRAMEWORK` variabile di ambiente. Ciascuna modalità deve consumare lo stesso inventario narrativo neutro; una scomparsa
  l'artefatto del framework è un errore del pacchetto/esportazione, non un motivo per filtrare quella storia.

L'intero ciclo di validazione statica è:

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

## Standard di sviluppo

### TypeScript Ovunque

Tutto il nuovo codice sorgente deve essere scritto negli SFC TypeScript (`.ts`) o Vue con `<script setup lang="ts">`.

- **Modalità rigorosa**: `strict: true` viene applicato a tutti i file `tsconfig.json`.
- **Tipi espliciti**: fornisce tipi espliciti per tutte le API pubbliche, le funzioni esportate e i componenti componibili.
- **Evita `any`**: utilizza tipi precisi o generici. Se un tipo è veramente sconosciuto, utilizzare `unknown` ed eseguire la restrizione del tipo.

### Componenti neutrali rispetto al contesto

Quando possibile, crea componenti dell'interfaccia utente utilizzando il dialetto `@mission-platform/forge-jsx`. Ciò consente ai componenti di essere
compilato e utilizzato in Vue, React, Svelte, Solid e Web Components senza riscrivere la logica principale. Configura il
risolutore del consumatore con la condizione `mp:vue`, `mp:react`, `mp:svelte`, `mp:solid` o `mp:web-component` corrispondente.

### Modelli di reattività (Vue 3)

- Utilizza esclusivamente la **Composition API**.
- Preferire `ref()` per la maggior parte degli stati per mantenere la coerenza.
- Estrarre la logica stateful complessa in **Composables** (`useXxx`).
- Assicurarsi che tutti gli effetti collaterali (osservatori, intervalli, ascoltatori di eventi) siano adeguatamente ripuliti in `onUnmounted`.

## Flusso di lavoro Monorepo

### Isolamento delle preoccupazioni

- **Nuovi componenti dell'interfaccia utente**: appartengono a `packages/`.
- **Utilità condivise**: appartengono a `packages/`.
- **Strumenti Lint/Format/Build**: le configurazioni condivise appartengono a `packages/tooling/configs/`.

### Linting e formattazione

Lo stile di codice coerente viene applicato tramite ESLint e Prettier.

- Eseguire `pnpm lint` per verificare eventuali violazioni.
- Esegui `pnpm format:write` per risolvere automaticamente i problemi di formattazione.
- I messaggi di commit devono seguire la specifica **Commit convenzionali**.

### Priming delle dipendenze upstream e test dei pacchetti

In un monorepo modulare, i pacchetti downstream importano spesso gli output di compilazione (`dist/`) dai pacchetti upstream. Per eliminare gli errori dei test in stato pulito ed evitare di monitorare manualmente l'ordine di compilazione di più pacchetti:

1. **Priming automatico della build upstream (`^build`)**:
   I grafici delle attività `turbo.json` definiscono `test`, `build:check` e le attività di verifica con `"dependsOn": ["^build"]`. L'esecuzione di qualsiasi attività di test o controllo del tipo tramite Turborepo crea prima automaticamente tutte le dipendenze dell'area di lavoro upstream.

2. **Esecuzione nell'ambito del pacchetto**:
   Per testare o creare un singolo pacchetto senza compilare manualmente i prerequisiti:
   - Eseguire test con priming:
     ```bash
     pnpm test:package <package-name>
     ```
     o direttamente tramite Turborepo:
     ```bash
     pnpm exec turbo run test --filter <package-name>
     ```
   - Costruisci un pacchetto con le sue dipendenze:
     ```bash
     pnpm build:package <package-name>
     ```
     o direttamente tramite Turborepo:
     ```bash
     pnpm exec turbo run build --filter <package-name>
     ```

   Nei filtri Turbo, `<package-name>...` seleziona il pacchetto E il suo upstream
   dipendenze, `...<package-name>` seleziona il pacchetto E il suo downstream
   dipendenti e `<package-name>^...` seleziona solo il pacchetto upstream
   dipendenze (escluso il pacchetto stesso). Gli helper del pacchetto vengono eseguiti esplicitamente
   il modulo upstream (`<package-name>^...`) consente innanzitutto di gestire i flussi di lavoro del pacchetto
   avere un riscaldamento prevedibile e memorizzabile nella cache; la dipendenza `^build` del grafico delle attività
   rimane la rete di sicurezza per le invocazioni dirette di Turborepo.

3. **Provisioning dell'albero di lavoro**:
   Quando viene effettuato il provisioning di nuovi alberi di lavoro Git tramite `pnpm worktree:create` o inizializzati tramite `pnpm worktree:setup`, le dipendenze upstream vengono automaticamente preparate prima di eseguire i controlli di convalida, garantendo che gli alberi di lavoro appena creati siano immediatamente operativi.

## Ottimizzazione delle prestazioni

- **Suddivisione del codice**: utilizza `import()` dinamico per funzionalità non critiche e librerie di grandi dimensioni.
- **Ottimizzazione delle risorse**: preferisci i formati di immagine moderni (WebP/AVIF) e assicurati che tutte le risorse statiche siano compresse.
- **Sovraccarico di reattività**: utilizzare `shallowRef` per oggetti di grandi dimensioni che non richiedono una reattività profonda.

## Test e documentazione

- **Sviluppo basato sui test**: ogni nuova funzionalità o correzione di bug deve essere accompagnata da test unitari (`.spec.ts`).
- **Documentazione Diátaxis**: Documentazione scritta seguendo il framework Diátaxis (Tutorial, Istruzioni, Riferimenti,
  Spiegazione).
- **TSDoc**: utilizza TSDoc/JSDoc per tutti i metodi e le proprietà rivolti al pubblico per potenziare l'intelligenza IDE.

## Risorse correlate

- [Guida al test](testing.md)
- [Best practice del framework](framework-best-practices.md)
- [Struttura dell'area di lavoro](workspace-structure.md)
- [Risoluzione dei problemi](troubleshooting.md)
