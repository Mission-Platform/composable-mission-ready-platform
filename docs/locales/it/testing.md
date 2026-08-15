# Test nella piattaforma di missione

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> Fonte inglese: [docs/testing.md](../../testing.md)
> Lingua: Italiano (it)

Questo documento descrive la strategia di test e gli strumenti per il monorepo Mission Platform. Serve sia come **How-to
guida** per attività di test comuni e un **riferimento tecnico** per la configurazione sottostante.

## Pila di test

Mission Platform utilizza uno stack di test moderno e unificato basato su Vitest:

- **Vitest**: il test runner principale per test di unità, componenti e basati su browser.
- **@vue/test-utils**: libreria standard per i test Vue componenti.
-**Vitest Modalità browser (drammaturgo)**: esecuzione del browser reale per l'interazione e il test visivo, se configurato.
- **Storybook Test Runner**: Integrazione tra storie di Storybook e Vitest per test di interazione automatizzati.

## Procedura: eseguire test

I test vengono eseguiti tramite Turborepo per sfruttare la memorizzazione nella cache e l'esecuzione consapevole dello spazio di lavoro.

### Esegui tutti i test

Per eseguire tutti i test di unità e componenti nell'intero monorepo:

```bash
pnpm test
```

### Esegui test per un'area di lavoro specifica

Per eseguire test per un singolo pacchetto o applicazione:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### Esegui test interessati (stile CI)
Per un feedback locale più rapido che corrisponda al CI `--affected` comportamento:

```bash
pnpm exec turbo run test --affected
```

`--affected` seleziona le attività di test per gli spazi di lavoro modificati rispetto alla revisione di base del repository. Omettilo per eseguire ogni
attività di test dell'area di lavoro. La copertura è specifica del pacchetto; ad esempio, il pacchetto componenti fornisce:

```bash
pnpm --filter @mission-platform/components test:coverage
```

### Modalità orologio
Per lo sviluppo, utilizza la modalità orologio per eseguire nuovamente i test sulle modifiche ai file:

```bash
pnpm --filter @mission-platform/components test:watch
```

### Rapporti di copertura

Per generare un report di copertura utilizzando il file `v8` fornitore:

```bash
pnpm --filter @mission-platform/components test:coverage
```

I report vengono inviati a `coverage/` directory all'interno di ogni area di lavoro.

## Come fare: scrivere test

### Test di unità e componenti

I test sono collocati insieme al codice sorgente e utilizzano il file `.spec.ts` (O `.spec.tsx`) estensione.

```typescript
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ForgeButton from './ForgeButton.vue';

describe('ForgeButton.vue', () => {
  it('renders props.label when passed', () => {
    const label = 'Click Me';
    const wrapper = mount(ForgeButton, {
      props: { label }
    });
    expect(wrapper.text()).toMatch(label);
  });

  it('emits click event when clicked', async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger('click');
    expect(wrapper.emitted()).toHaveProperty('click');
  });
});
```

### Test del browser

La piattaforma di missione utilizza VitestLa modalità browser di per test che richiedono un ambiente DOM reale o cross-browser
verifica.

1. Crea il tuo file di test come al solito.
2. Assicurare il pacco `vitest.config.ts` abilita la modalità browser (vedere Riferimento di seguito).
3. Corri con `pnpm test`.

## Riferimento tecnico

### Configurazione condivisa

La maggior parte degli spazi di lavoro utilizza il file `defineVitestConfig` utilità da `@mission-platform/vite-config`. Ciò fornisce un file standardizzato
ambiente:

- **Ambiente**: `jsdom` per impostazione predefinita.
- **Globali**: abilitato (non è necessario importare `describe`, `it`, `expect` se non desiderato).
- **Plugin**: include `@vitejs/plugin-vue` e blocco i18n ignorato.
- **Copertura**: preconfigurata `v8` fornitore.

**Esempio `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  }
});
```

### Struttura delle directory

- `src/**/*.spec.ts`: Test unitari e test dei componenti.
- `src/**/*.stories.tsx`: Storie di libri di fiabe (utilizzate anche come definizioni di test di interazione).
- `apps/storybook/vitest.config.ts`: configurazione principale per test di interazione basati su browser.

### Riepilogo degli script

| Scrittura | Comando | Scopo |
|:----------------|:--------------------------|:--------------------------------------------|
| `test`          | `pnpm exec turbo run test`                              | Esegui tutte le attività di test dell'area di lavoro.            |
| `test:watch`    | `pnpm --filter @mission-platform/components test:watch` | Esegui test dei componenti in modalità orologio.      |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` | Genera un report sulla copertura dei componenti. |
| Ruggine/WASM | `cargo test --workspace` | Esegui test dei crate nativi di Rust. |

I pacchetti wrapper Wasm vengono testati tramite le attività del pacchetto proprietario. Ad esempio, esegui il pacchetto scanner e il suo file
wrapper insieme quando si modifica il comportamento dello scanner:

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## Documentazione correlata

- [Configurazione dello sviluppo](development-setup.md)
- [Migliori pratiche](best-practices.md)
- [Sviluppo di pacchetti](package-development.md)
