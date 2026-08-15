# Migliori pratiche quadro

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> Fonte inglese: [docs/framework-best-practices.md](../../framework-best-practices.md)
> Lingua: Italiano (it)

Questo documento fornisce indicazioni su modelli idiomatici, modelli di reattività e ottimizzazioni delle prestazioni per i framework supportati dalla Mission Platform. Serve come **Spiegazione** della nostra strategia multi-framework e come riferimento per lo sviluppo specifico del framework.

## Strategia multi-quadro

La filosofia fondamentale di Mission Platform è costruire una volta ed eseguire il rendering ovunque. Ciò si ottiene attraverso **@mission-platform/forge**, il framework principale della piattaforma: un runtime JSX indipendente dal framework in cui tutti i componenti condivisi (tutto tranne le app) vengono creati e da cui vengono renderizzati senza soluzione di continuità Vue 3, Reacte altri ambienti supportati.

### Il dialetto della Forgia
Quando crei pacchetti condivisi, crea componenti utilizzando le primitive neutre di Forge:
- **JSX Factory**: utilizzare `h` E `Fragment` da `@mission-platform/forge`.
- **Ganci neutri**: utilizzare `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`, E `useId`.
- **Primitive**: utilizzare `Slot`, `Teleport`, `Transition`, E `Dynamic` per strutture UI complesse.

## Vue 3

Vue 3 è il framework in cui si trovano le applicazioni `apps/` sono costruiti con e la destinazione di rendering nativa primaria per i componenti Forge. Gli stessi componenti condivisi vengono creati in Forge JSX anziché direttamente all'interno Vue.

### Modelli idiomatici
- **API di composizione**: utilizzare `<script setup lang="ts">` per tutti i nuovi componenti.
- **Integrazione Forge**: avvolgi componenti neutri utilizzando `toVueComponent` da `@mission-platform/forge/vue`.
- **Componibili**: estrae la logica con stato in `useXxx` funzioni per promuovere la riusabilità.

### Ottimizzazioni delle prestazioni
- **Reattività superficiale**: utilizzare `shallowRef` O `shallowReactive` per set di dati grandi e complessi per evitare il sovraccarico del proxy.
- **v-memo**: utilizzare `v-memo` nei modelli per saltare costosi aggiornamenti del sottoalbero in base alle modifiche delle dipendenze.
- **markRaw**: racchiude istanze di librerie di terze parti (ad esempio Chart.js, Mapbox) in `markRaw` per prevenire Vue dal tentativo di renderli reattivi.

## React

React è supportato tramite l'adattatore runtime Forge, principalmente per integrazioni esterne e strumenti interni specifici.

### Modelli idiomatici
- **Componenti funzionali**: utilizza componenti funzionali con ganci.
- **Integrazione Forge**: avvolgi componenti neutri utilizzando `toReactComponent` da `@mission-platform/forge/react`.
- **Disciplina degli Hooks**: seguire rigorosamente le "Regole degli Hooks" per garantire un comportamento prevedibile.

### Ottimizzazioni delle prestazioni
- **Memoizzazione**: utilizzare `React.memo`, `useMemo`, E `useCallback` per mantenere l'identità referenziale ed evitare re-render inutili.
- **Funzionalità simultanee**: Leva `useTransition` O `useDeferredValue` per aggiornamenti dell'interfaccia utente non urgenti per mantenere il thread principale reattivo.

## Altri quadri

Mission Platform fornisce diversi livelli di supporto per altri framework tramite gli adattatori Forge:

- **SolidJS**: utilizza una reattività a grana fine tramite segnali. Evitare di destrutturare gli oggetti di scena per mantenere la reattività.
-**Svelte 5**: Sfrutta le rune (`$state`, `$derived`, `$effect`) per la reattività moderna.
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
- [@mission-platform/forge LEGGIMI](../../../packages/forge/README.md)
