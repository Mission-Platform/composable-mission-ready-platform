# Migliori pratiche quadro

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/framework-best-practices.md: [docs/framework-best-practices.md](../../framework-best-practices.md)
> Lingua: Italiano (it)

Questo documento fornisce indicazioni su modelli idiomatici, modelli di reattività e ottimizzazioni delle prestazioni per i framework supportati dalla Mission Platform. Serve come **Spiegazione** della nostra strategia multi-framework e come riferimento per lo sviluppo specifico del framework.

## Strategia multi-quadro

La filosofia fondamentale di Mission Platform è costruire una volta ed eseguire il rendering ovunque. Ciò si ottiene tramite **@mission-platform/forge-jsx**, il framework principale della piattaforma: un runtime JSX indipendente dal framework in cui vengono creati tutti i componenti condivisi (tutto tranne le app) e da cui viene eseguito il rendering senza problemi in Vue 3, React e altri ambienti supportati.

### Il dialetto della Forgia
Quando crei pacchetti condivisi, crea componenti utilizzando le primitive neutre di Forge:
- **JSX Factory**: utilizzare `h` e `Fragment` da `@mission-platform/forge-jsx`.
- **Hook neutri**: utilizzare `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback` e `useId`.
- **Primitive**: utilizzare `Slot`, `Teleport`, `Transition` e `Dynamic` per strutture UI complesse.

## Vue 3

Vue 3 è il framework con cui sono create le applicazioni in `apps/` e la destinazione di rendering nativa primaria per i componenti Forge. Gli stessi componenti condivisi vengono creati in Forge JSX anziché direttamente in Vue.

### Modelli idiomatici
- **API di composizione**: utilizzare `<script setup lang="ts">` per tutti i nuovi componenti.
- **Integrazione Forge**: avvolgere i componenti neutri utilizzando `toVueComponent` da `@mission-platform/forge-adapters/vue`.
- **Componibili**: estrae la logica con stato nelle funzioni `useXxx` per promuovere la riusabilità.

### Ottimizzazioni delle prestazioni
- **Reattività superficiale**: utilizzare `shallowRef` o `shallowReactive` per set di dati complessi e di grandi dimensioni per evitare il sovraccarico del proxy.
- **v-memo**: utilizza `v-memo` nei modelli per saltare costosi aggiornamenti del sottoalbero in base alle modifiche delle dipendenze.
- **markRaw**: racchiude le istanze della libreria di terze parti (ad esempio, Chart.js, Mapbox) in `markRaw` per impedire a Vue di tentare di renderle reattive.

## React

React è supportato tramite l'adattatore runtime Forge, principalmente per integrazioni esterne e strumenti interni specifici.

### Modelli idiomatici
- **Componenti funzionali**: utilizza componenti funzionali con ganci.
- **Integrazione Forge**: avvolgere i componenti neutri utilizzando `toReactComponent` da `@mission-platform/forge-adapters/react`.
- **Disciplina degli Hooks**: seguire rigorosamente le "Regole degli Hooks" per garantire un comportamento prevedibile.

### Ottimizzazioni delle prestazioni
- **Memoizzazione**: utilizzare `React.memo`, `useMemo` e `useCallback` per mantenere l'identità referenziale ed evitare nuovi rendering non necessari.
- **Funzionalità simultanee**: sfrutta `useTransition` o `useDeferredValue` per aggiornamenti dell'interfaccia utente non urgenti per mantenere reattivo il thread principale.

## Altri quadri

Mission Platform fornisce diversi livelli di supporto per altri framework tramite gli adattatori Forge:

- **SolidJS**: utilizza una reattività a grana fine tramite segnali. Evitare di destrutturare gli oggetti di scena per mantenere la reattività.
- **Svelte 5**: Sfrutta le rune (`$state`, `$derived`, `$effect`) per una reattività moderna.
- **Componenti Web (acceso)**: utile per creare componenti altamente portabili che devono essere eseguiti in ambienti legacy o senza un framework.

## Modelli di prestazioni e reattività

| Quadro | Modello di reattività | Aggiorna strategia |
| :--- | :--- | :--- |
| **Vue 3** | Basato su proxy | DOM virtuale con ottimizzazioni del compilatore. |
| **React** | Stato immutabile | Riconciliazione DOM virtuale. |
| **SolidoJS** | Segnali a grana fine | Aggiornamenti DOM diretti (no VDOM). |
| **Svelte 5** | Rune/Segnali | Aggiornamenti diretti del DOM tramite compilatore. |
| **Lit** | Proprietà reattive | Aggiornamenti asincroni Shadow DOM. |

## Risorse correlate
- [Migliori pratiche](best-practices.md)
- [Guida al test](testing.md)
- [@mission-platform/forge-jsx LEGGIMI](../../../packages/core/forge-jsx/README.md)
