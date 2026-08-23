# @mission-platform/i18n-config

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> configs/i18n-config/docs/index.md: [configs/i18n-config/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Configurazione locale e di estrazione condivisa per le aree di lavoro di Mission Platform.

## Installare e utilizzare

Aggiungi questo pacchetto come dipendenza di sviluppo durante la configurazione di i18next o
estrazione della traduzione:

```bash
pnpm add --save-dev @mission-platform/i18n-config
```

Mantieni le origini locali accanto all'area di lavoro che le possiede. L'estrazione scrive
bundle di spazi dei nomi sotto lo spazio di lavoro proprietario `locales/<locale>/` elenco;
il comando a livello di repository orchestra tutte le aree di lavoro configurate.

## Contribuire

Esegui i controlli lint e formato del pacchetto prima della pubblicazione. Non mettere il pacchetto o
contenuto della traduzione dell'applicazione in questo pacchetto di configurazione.
