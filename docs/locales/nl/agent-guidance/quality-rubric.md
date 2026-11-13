# Rubriek Werkkwaliteit van agenten

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/agent-guidance/quality-rubric.md: [docs/agent-guidance/quality-rubric.md](../../../agent-guidance/quality-rubric.md)
> Taal: Nederlands (nl)

Gebruik deze rubriek vóór de implementatie om een ​​aanpak te kiezen en tijdens de review om het resultaat te beoordelen. Pas elke dimensie toe die bij de taak past; een wijziging die alleen uit documentatie bestaat, moet nog steeds eenvoudig, onderhoudbaar, leesbaar en hygiënisch zijn. Registreer concreet bewijs voor materiële afwegingen in plaats van de rubriek als een subjectieve score te behandelen.

## Kleinste veilige verandering

- Vermeld de gevraagde uitkomst en de kleinste verandering die hieraan kan voldoen.
- Geef de voorkeur aan bestaande repositorypatronen, pakketten, tools, profielen en documentatie boven nieuwe abstracties.
- Houd niet-gerelateerde opschoningen, speculatief herontwerp en niet-goedgekeurde MCP-runtimewijzigingen buiten de taak.
- Breid de reikwijdte alleen uit als uit bewijs blijkt dat de kleinere aanpak de correctheid, veiligheid of vereiste validatie niet kan behouden.

## Zeven dimensies

### Eenvoud

- Gebruikt de oplossing zo min mogelijk bestanden, bewegende delen, afhankelijkheden, statusovergangen en toolaanroepen die aan de vereiste voldoen?
- Hergebruikt het een bestaande component, hulpprogramma, token, vertaling, workflow of MCP-mogelijkheid in plaats van er één te dupliceren?
- Zijn speculatieve abstracties, dubbele MCP-tools en onnodige configuratiewijzigingen verwijderd?

### Complexiteit

- Identificeer nieuwe afhankelijkheden, status, controlestroom, grensoverschrijdende pakketten, profiel-/gereedschapsoppervlak, operationele stappen en faalmodi.
- Leg uit waarom elke onvermijdelijke bron van complexiteit nodig is en waarom een ​​eenvoudiger alternatief onvoldoende is.
- Houd de complexiteit lokaal voor het pakket of het onderwerpdocument dat eigenaar is, en vermijd het verspreiden van beleid over dubbele bronnen.

### Betrouwbaarheid

- Definieer waarneembaar verwacht gedrag en het bewijsmateriaal dat dit zal aantonen.
- Geef de voorkeur aan deterministisch gedrag, begrensde operaties, expliciete foutafhandeling en veilige terugval.
- Valideer de paden die er toe doen, inclusief negatieve gevallen en integratiegrenzen; behandel een gedeeltelijke armatuur, brondiagnostiek of geïsoleerde eenheid niet als bewijs van end-to-end-gedrag.
- Rapporteer mislukkingen, onzekerheid en niet-geverifieerde aannames in plaats van stilletjes succes af te leiden.

### Onderhoudbaarheid

- Volg de repositoryconventies voor structuur, naamgeving, afhankelijkheden, tests, documentatie en eigendom.
- Houd de verantwoordelijkheden lokaal en geef elke regel één canonieke documentatie.
- Documenteer duurzame beslissingen en niet voor de hand liggende beperkingen waar een toekomstige agent ze zal vinden.
- Vermijd verouderde links, dubbele inventarissen, parallelle implementaties en bewoordingen die kunnen afwijken van de bron van de waarheid.

### Beveiliging

- Behoud de minste privileges, root- en padgrenzen van de repository, shell-vrije uitvoering, expliciete goedkeuring van mutaties en geheime hygiëne.
- Verdedig je tegen injectie, gebruik goedgekeurde cryptografie- en afhankelijkheidspraktijken en behoud de afhankelijkheidsrichting.
- Verzwak bestaande beveiligingsscans niet en vervang voor het gemak de begrensde/alleen-lezen-inspectie niet door bredere toegang.
- Voer voor toepasselijke wijzigingen de relevante ontwikkelaars-MCP-beveiligingscontroles uit: `security_scan_secrets`, `security_analyze_code`, `security_audit_dependencies`, `security_audit_supply_chain`, `security_collect_compliance_evidence` en `security_audit_compliance`.

### Hygiëne

- Houd de diff gefocust en behoud de opmaak, naamgeving en workflowconventies van de repository.
- Verwijder tijdelijke artefacten die tijdens de taak zijn gemaakt, zonder reeds bestaande of sessiebeheerde bestanden te verwijderen.
- Werk de betrokken documentatie en koppelingen bij en controleer of er geen gegenereerde, lokale, geheime of niet-gerelateerde bestanden zijn opgenomen.
- Rapporteer de exacte uitgevoerde validatie en eventuele controles die niet konden worden uitgevoerd.

### Leesbaarheid en begrip

- Gebruik een duidelijke kophiërarchie, korte secties, consistente terminologie en directe zinnen, zodat de beoogde agent de begeleiding snel kan scannen.
- Minimaliseer de cognitieve belasting: presenteer voorwaarden vóór acties, houd gerelateerde regels bij elkaar, identificeer verplicht versus optioneel werk en vermijd onverklaarde kruisverwijzingen.
- Verklaar niet voor de hand liggende beperkingen, eigendom, prioriteit, veiligheidsgrenzen en de reden voor een ongebruikelijke validatievereiste.
- Controleer of links, voorbeelden, namen en uitvoerbeschrijvingen begrijpelijk zijn zonder verborgen sessiecontext.
- Voer een onafhankelijke begripspas uit: kan een andere agent de begeleiding volgen en alleen uit het document de juiste volgende actie kiezen?

## Beoordelingsrecord

Voor een niet-triviale taak vat u de bevindingen van de rubriek samen in de eindbeoordeling of de overdracht. Noem de kleinste veilige aanpak, de materiële complexiteit, bewijs van betrouwbaarheid, veiligheids- en hygiënecontroles en elk leesbaarheidsprobleem dat afzonderlijk geautoriseerd vervolgwerk zou moeten worden.

Gerelateerd beleid: [Veiligheid en validatie van opslagplaatsen](repository-safety-and-validation.md) en [Sessie-zelfbeoordeling](session-self-review.md).
