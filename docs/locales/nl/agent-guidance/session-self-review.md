# Sessie Zelfevaluatie

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/agent-guidance/session-self-review.md: [docs/agent-guidance/session-self-review.md](../../../agent-guidance/session-self-review.md)
> Taal: Nederlands (nl)

Voltooi deze beoordeling aan het einde van elke sessie, ongeacht of de taak is geslaagd, mislukt of gestopt vóór de implementatie. De beoordeling is een afsluitingsrecord en geen toestemming om de huidige taak uit te breiden.

## Resultaatbeoordeling

Leg beknopt bewijsmateriaal vast voor:

- Wat werd geprobeerd en welk resultaat werd gevraagd.
- Verwacht gedrag versus waargenomen gedrag.
- Aannames die werden bevestigd, weerlegd of onzeker bleven.
- Mislukkingen, geblokkeerd werk, achteruitgang en onopgeloste risico's.
- Verificatie uitgevoerd, inclusief opdrachten, tests, diagnostiek, scans, beoordelingen en hun resultaten.
- Of de uiteindelijke diff gefocust, draagbaar, vrij van tijdelijke artefacten en consistent met repositoryconventies is.
- Welke begeleiding maakte het werk mogelijk en welke instructie was dubbelzinnig, moeilijk te ontdekken, gedupliceerd, oud of onnodig duur.

Behoud conventies die werkten. Maak onderscheid tussen waargenomen problemen en hypothesen of speculatieve verbeterideeën, en neem het bewijsmateriaal op dat elke voorgestelde verandering ondersteunt.

## MCP-recensie

Wanneer er MCP-tools of -profielen zijn gebruikt, beantwoord dan deze vragen:

- Was het geselecteerde profiel het minimale profiel dat de taak kon voltooien?
- Hadden begrensde, alleen-lezen inspectietools de voorkeur totdat expliciet schrijven nodig was?
- Waren `review_changes` en de beschikbare veiligheidscontroles voldoende om de voorgestelde mutatie en de risico's ervan te inspecteren?
- Zorgden een schema, uitvoerlimiet, pagineringslimiet, time-out of tool-ergonomie voor wrijving of verborgen ze nuttig bewijsmateriaal?
- Vereist een schrijfpad een duidelijkere bevestiging, smallere grenzen, sterkere isolatie of een veiligere terugval?
- Komen de terminologie en het gedrag overeen met `mcp/README.md`, `mcp/developer/README.md`, `.ai/mcp/mcp.json`, `scripts/launch-mcp.mjs`, `mcp/developer/src/tools/profiles.ts` en `mcp/developer/src/tools/index.ts`?

Stel geen breder profiel of een nieuw instrument voor alleen maar omdat het handig is. Leg de kleinste verandering uit die een waargenomen veiligheids-, betrouwbaarheids- of begripsprobleem zou kunnen wegnemen.

## Verbeterbesluit

Classificeer elke verbeteringsmogelijkheid:

- **Opvolging van documentatie:** gebruik wanneer het gedrag van de repository correct is, maar begeleiding ontbreekt, onduidelijk, gedupliceerd, verouderd of moeilijk te ontdekken is. Stel de kleinste update voor van `AGENTS.md` of het onderwerpdocument dat eigenaar is.
- **Afzonderlijk geautoriseerde implementatie:** gebruik wanneer de bevinding het MCP-runtimegedrag, profielen, schema's, serverregistratie, `.ai/mcp/mcp.json`, tooling of een andere implementatie vereist. Leg het vast als vervolg; implementeer het niet als onderdeel van een documentatiebeoordeling, tenzij u hiervoor expliciet toestemming hebt gegeven.
- **Geen verandering:** gebruik wanneer de waarneming speculatief is, geen bewijs bevat, of de bestaande conventie de veiligste en duidelijkste keuze blijft.

Bij elke follow-up moet de afhankelijkheidsrichting, expliciete mutatiegrenzen, portabiliteit, achterwaartse compatibiliteit, minimale privileges en begrensde bewerkingen behouden blijven. Koppel het bewijsmateriaal en identificeer de eigenaar, de betrokken bron van waarheid en de kleinste veilige volgende actie.

## Closeout Format

Gebruik dit compacte formaat bij de definitieve overdracht wanneer een schriftelijke beoordeling vereist is:

```markdown
### Session self-review
- Outcome: <expected and observed result>
- Evidence: <checks performed and results>
- Assumptions or uncertainty: <confirmed, disproved, or unresolved items>
- Guidance and MCP findings: <what helped or caused friction>
- Follow-up: <documentation, separately authorized implementation, or no change; include evidence>
```

Gerelateerd beleid: [Kwaliteitsrubriek](quality-rubric.md), [Veiligheid en validatie van opslagplaatsen](repository-safety-and-validation.md) en de hoofdmap [AGENTS.md](../../../../AGENTS.md).
