# @mission-platform/theme

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/theme/docs/index.md: [packages/theme/docs/index.md](../../index.md)
> Lingua: Italiano (it)

`@mission-platform/theme` possiede la superficie del tema riscrivibile estratta da `@mission-platform/components`.

## Superficie pubblica

- `ForgeThemeToggle` alterna la preferenza condivisa di luce, buio e automatica.
- `ForgeThemeProvider` configura la persistenza ed espone lo stato del tema attraverso la sua prop di rendering con ambito.
- `ForgeThemeComposer` controlla le sostituzioni del token `--mp-*` con ambito o globale.
- I contratti del negozio a tema includono `getThemeSnapshot`, `subscribeTheme`, `setTheme`, `toggleTheme`, `cycleTheme` e
  `configureTheme`.
- I contratti del compositore includono l'unione delle configurazioni, la mutazione di attributi/token, la conversione di variabili CSS e gli helper di ripristino.

Tutti i componenti e gli archivi utilizzano un'implementazione locale del pacchetto, in modo che i consumatori del provider, dell'interruttore e del compositore osservino
gli stessi contratti di runtime dopo la compilazione Forge specifica del framework.
