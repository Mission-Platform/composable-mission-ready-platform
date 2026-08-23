# `@mission-platform/vcard`

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/vcard/docs/index.md: [packages/vcard/docs/index.md](../../index.md)
> Lingua: Italiano (it)

API di dati vCard RFC 6350 condivise e iCalendar RFC 5545 per Mission Platform.

Il pacchetto fornisce l'analisi e la scrittura di componenti/proprietà senza perdite
`readICalendar`/`writeICalendar` e `readVCard`/`writeVCard`, più Forge
renderer denominati `ForgeVCard` e `ForgeICalendar`. `ForgeICalendar` accetta il
risultato normalizzato di `calendarEvents(readICalendar(source))` quindi generato
i componenti del framework rimangono indipendenti dai moduli runtime del parser.

Vedere `llms.txt` per l'API pubblica e gli esempi di utilizzo.
