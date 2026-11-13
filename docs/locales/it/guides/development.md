# Guida allo sviluppo

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/guides/development.md: [docs/guides/development.md](../../../guides/development.md)
> Lingua: Italiano (it)

## Ciclo di vita della costruzione della forgia

I pacchetti Forge utilizzano lo stesso contratto di sessione pigra di Vite e tsdown. Tieni
selezione del target esplicita costruendo un framework di proprietà del chiamante o un output CMS
plug-in, quindi collegare i plug-in dell'adattatore alla configurazione nativa del bundler.

```ts
import { tsdownForgeComponentPlugins } from "@mission-platform/vite-plugin-forge";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";
import { defineTsdownLibrary } from "@mission-platform/tsdown-config";

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: "src/index.ts",
  plugins: tsdownForgeComponentPlugins({
    rootDir: import.meta.dirname,
    componentsModule: `${import.meta.dirname}/src/components/index.ts`,
    frameworks: [forgeVueFramework()],
    name: "Components",
  }),
});
```

La valutazione della configurazione è volutamente economica: scoperta del grafico, sorgente
la generazione, il raggruppamento nativo, le dichiarazioni e la pubblicazione iniziano dal bundler
ganci del ciclo di vita. La sessione condivisa riutilizza l'analisi neutra tra quelli selezionati
prende di mira e invalida i dipendenti inversi quando la modalità orologio segnala una modifica.

Ogni destinazione scrive in una directory di tentativi isolata e viene promossa solo dopo
il suo manifest, le dichiarazioni, le mappe, le risorse e i moduli generati vengono convalidati. A
la compilazione non riuscita, annullata o incompleta rimuove solo il tentativo e preserva
l'ultimo albero `dist/<target>` riuscito e gli obiettivi fratelli.

Per i ganci utilizzare `tsdownForgeHookPlugins`; per l'utilizzo delle proiezioni CMS
`tsdownForgeCmsPlugins` da `@mission-platform/forge-cms-plugin-api`. Non farlo
chiamare gli aiutanti per la generazione durante la costruzione della configurazione e non introdurre
tabelle di commutazione del framework nel compilatore neutro.

## Verifica

Esegui le suite Forge e CMS mirate prima delle build rappresentative dei consumatori:

```bash
pnpm --filter @mission-platform/vite-plugin-forge test
pnpm --filter @mission-platform/forge-cms-plugin-api test
pnpm --filter @mission-platform/vite-plugin-forge build
```

La suite Forge copre l'esecuzione pigra del ciclo di vita, chiavi di cache deterministiche,
invalidazione inversa, coordinamento target simultaneo, artefatto dichiarazione/CSS
pubblicazione, sicurezza del manifest e rollback nella directory di destinazione pubblicata.
