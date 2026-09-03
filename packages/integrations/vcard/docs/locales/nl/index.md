# `@mission-platform/vcard`

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/integrations/vcard/docs/index.md: [packages/integrations/vcard/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Gedeelde RFC 6350 vCard- en RFC 5545 iCalendar-gegevens-API's voor Mission Platform.

Het pakket biedt verliesvrije parsering en doorschrijving van componenten/eigendommen
`readICalendar`/`writeICalendar` en `readVCard`/`writeVCard`, plus Forge
renderers genaamd `ForgeVCard` en `ForgeICalendar`. `ForgeICalendar` accepteert de
genormaliseerd resultaat van `calendarEvents(readICalendar(source))`, dus het gegenereerde
raamwerkcomponenten blijven onafhankelijk van parser-runtimemodules.

Zie `llms.txt` voor de openbare API en gebruiksvoorbeelden.
