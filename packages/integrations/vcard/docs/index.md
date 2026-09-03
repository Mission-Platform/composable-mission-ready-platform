# `@mission-platform/vcard`

Shared RFC 6350 vCard and RFC 5545 iCalendar data APIs for Mission Platform.

The package provides lossless component/property parsing and writing through
`readICalendar`/`writeICalendar` and `readVCard`/`writeVCard`, plus Forge
renderers named `ForgeVCard` and `ForgeICalendar`. `ForgeICalendar` accepts the
normalized result of `calendarEvents(readICalendar(source))` so the generated
framework components remain independent of parser runtime modules.

See `llms.txt` for the public API and usage examples.
