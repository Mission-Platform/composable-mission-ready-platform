# @mission-platform/icons

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/icons/docs/index.md: [packages/icons/docs/index.md](../../index.md)
> Lingua: Italiano (it)

`@mission-platform/icons` è una raccolta di componenti di icone SVG indipendenti dal framework per Mission Platform. Ogni icona lo è
creato una volta e compilato nelle build native Vue 3, React, Solid, Svelte e nel componente Web al momento della compilazione.

## Architettura e distribuzione

Il pacchetto sfrutta `@mission-platform/vite-plugin-forge` per fornire a tutti icone scuotebili ad alte prestazioni
framework supportati:

- **Compilazione**: un singolo `pnpm build` emette un bundle nativo del framework per destinazione, un `dist/icons.svg` deterministico
  sprite e risorse CSS per icona.
- **Ingresso unico, risoluzione condizionata**: esiste esattamente un punto di ingresso pubblico,
  `@mission-platform/icons`. Contiene `mp:vue`, `mp:react`, `mp:solid` e
  `mp:web-component` condizioni di esportazione; qualunque sia attivato dalla tua toolchain decide quale compilato costruisce il bare
  lo specificatore si risolve in. Senza alcuna condizione impostata, si ritorna alla fonte della forgia neutrale, che è l'altra cosa
  I componenti "write-once" consumano.

## Utilizzo

### Scelta di un quadro

Selezionare il framework **una volta**, non per importazione: da Vite a `resolve.conditions` (utilizzare
`defineFrameworkAppConfig` o `frameworkResolveConditions` da `@mission-platform/vite-config`) e in TypeScript
tramite `customConditions` (estendere un file `@mission-platform/typescript-config/framework-<name>`
preimpostato):

```ts
resolve: {
  conditions: frameworkResolveConditions('mp:vue'),
}
```

### Importazioni

Ogni importazione è quindi semplice e identica tra i framework:

**Vue 3** (`mp:vue` attivo):

```vue
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

**React** (`mp:react` attivo):

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

### Importazioni di componenti neutrali

Quando si crea un componente indipendente dal framework (compilato da `vite-plugin-forge`), nessuna condizione `mp:*` è attiva e il
lo stesso specificatore ti dà la fonte neutra:

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

## Tassonomia e catalogo

Le cartelle di creazione e i titoli dei libri di fiabe seguono `icons/<category>/<subcategory>/<icon-name>`. Le copertine del catalogo recensito
`navigation`, `text`, `maps`, `routing`, `drawing`, `content`, `status`, `communication`, `media`, `security`, `data`,
`time` e `objects`. La revisione del gap è registrata in `src/catalog.ts`; mantiene il sostegno del paese basato sui dati e sui registri
posticipazione della grafica specifica per l'applicazione invece di creare un componente per paese.

## Riutilizzo degli sprite

Ogni wrapper esegue il rendering di un `<svg>` esterno accessibile con un riferimento `<use href="#icon-id">`. `IconSpriteProvider` monta
i simboli canonici una volta per un sottoalbero in linea:

```tsx
import { ForgeIconAlert, ForgeIconArrow, IconSpriteProvider } from '@mission-platform/icons';

export function Toolbar() {
  return (
    <IconSpriteProvider>
      <ForgeIconAlert ariaLabel="Alert" />
      <ForgeIconArrow
        direction="right"
        ariaLabel="Next"
      />
    </IconSpriteProvider>
  );
}
```

Per una risorsa esterna memorizzabile nella cache utilizzare `src="/assets/icons.svg"` con `inline={false}`. Riferimenti a frammenti SVG esterni
richiedere un accesso dalla stessa origine o una policy CORS compatibile; la modalità in linea è il fallback per SSR, CSP restrittivo o browser
che non può risolvere i frammenti esterni. La build del pacchetto emette `dist/icons.svg`, disponibile anche come
`@mission-platform/icons/icons.svg`.

## API di paese e composizione

`ForgeIconFlag` e `ForgeIconCountryGlobe` accettano codici in stile ISO maiuscoli da `SUPPORTED_COUNTRY_CODES`, inclusi
`US`, `CA`, `JP`, `GB` e `ZA`. I valori di runtime non supportati generano un errore descrittivo. Globi nazionali, percorso/waypoint
i modelli e le sovrapposizioni future sono composizioni di simboli digitati: fanno riferimento a ID esistenti con trasformazioni e vengono controllati
per riferimenti e cicli mancanti prima della generazione degli sprite.

## Riferimento API

Ciascuna icona esegue il rendering di un `<svg role="img">` all'interno di un wrapper `<div>` centrato che utilizza la classe BEM `.forge-icon-<name>`.
Tutte le icone sono basate su una viewbox da $24 \times 24$.

### Puntelli universali

| Prop | Digitare | Predefinito | Descrizione |
| :---------- | :----------------- | :----------------- | :-------------------------------------------------------------------------------------------------------------------- |
| `size` | `number \| string` | `'md'` | Larghezza e altezza. Supporta token denominati (`'2xs'`, `'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'`, `'2xl'`) o un numero di pixel. |
| `color` | `string` | `'currentColor'` | Colore del tratto (e riempimento per le icone dei marcatori pieni).                                                                     |
| `ariaLabel` | `string` | _Predefinito per icona_ | Nome accessibile. Se omessa, l'icona è contrassegnata come `aria-hidden`.                                                     |

### Icone comportamentali

Alcune icone includono oggetti aggiuntivi per controllarne l'aspetto:

| Icona | Oggetti di scena extra | Descrizione |
| :----------------- | :-------------------------------------------------------------------- | :--------------------------------------------------------- |
| `ForgeIconArrow` | `direction`: `'up' \| 'right' \| 'down' \| 'left'` (predefinito `'up'`) | Ruota la freccia tramite una trasformazione in linea.                 |
| `ForgeIconChevron` | `direction`: `'up' \| 'right' \| 'down' \| 'left'` (predefinito `'down'`) | Ruota la freccia di espansione tramite una trasformazione in linea.               |
| `ForgeIconSort` | `active`: `boolean`, `direction`: `'asc' \| 'desc' \| undefined` | Evidenzia la freccia che corrisponde alla direzione di ordinamento attiva. |

## Libreria di icone

La libreria include una vasta gamma di icone che coprono diverse categorie:

- **Stato e stato**: `ForgeIconAlert`, `ForgeIconCheck`, `ForgeIconError`, `ForgeIconInfo`, `ForgeIconWarning`.
- **Navigazione**: `ForgeIconArrow`, `ForgeIconChevron`, `ForgeIconHome`, `ForgeIconMenu`, `ForgeIconExternalLink`.
- **Supporti**: `ForgeIconCamera`, `ForgeIconImage`, `ForgeIconMail`, `ForgeIconPhone`.
- **Controlli dell'interfaccia utente**: `ForgeIconClose`, `ForgeIconEdit`, `ForgeIconPlus`, `ForgeIconMinus`, `ForgeIconSearch`,
  `ForgeIconSettings`.
- **Formattazione contenuto**: `ForgeIconBold`, `ForgeIconItalic`, `ForgeIconBulletList`, `ForgeIconNumberedList`,
  `ForgeIconHeadingOne`...
  `ForgeIconHeadingSix`.
- **Strumenti specializzati**: `ForgeIconWrench`, `ForgeIconPalette`, `ForgeIconDebug`, `ForgeIconQrCode`.

## Sviluppo e manutenzione

### Icone della costruzione

La build di proprietà del pacchetto emette dichiarazioni neutre, tutti gli adattatori del framework e lo sprite SVG. Dopo aver cambiato catalogo o
sorgente sprite, esegui:

```sh
pnpm exec turbo run build:check --filter @mission-platform/icons
pnpm exec turbo run build --filter @mission-platform/icons
```

### Libro di fiabe

Le icone sono catalogate sotto `icons/<category>/<subcategory>/<icon-name>`, mentre `icons/overview` rimane la galleria completa.
La panoramica mostra anche icone ripetute attraverso un `IconSpriteProvider`; le storie individuali espongono `size`,
`color`, codice paese e controlli `ariaLabel` ove applicabile.
