# Circulair afhankelijkheidsmanagement

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/circular-dependencies.md: [docs/circular-dependencies.md](../../circular-dependencies.md)
> Taal: Nederlands (nl)

Dit document legt de impact uit van circulaire afhankelijkheden binnen het Mission Platform monorepo en biedt een **How-to
gids** voor het detecteren, oplossen en voorkomen ervan. Het dient zowel als **Verklaring** van monorepo-gezondheid als als een
technisch recept voor refactoring.

## Wat zijn circulaire afhankelijkheden?

Er is sprake van een circulaire afhankelijkheid wanneer twee of meer pakketten direct of indirect van elkaar afhankelijk zijn. Bijvoorbeeld:

- Pakket A importeert uit pakket B.
- Pakket B importeert uit pakket A.

In een monorepo zijn deze cycli bijzonder schadelijk omdat ze het volgende kunnen veroorzaken:

- **Buildfouten**: resolutie van de afhankelijkheidsgrafiek (bijvoorbeeld door Turborepo of pnpm) kan vastlopen of mislukken.
- **Runtimefouten**: de ene module wordt mogelijk gedeeltelijk geïnitialiseerd wanneer de andere de export probeert te gebruiken.
- **Verbeterde koppeling**: pakketten kunnen onmogelijk afzonderlijk worden gebruikt of getest.

## Detectie

Mission Platform maakt gebruik van verschillende geautomatiseerde tools om circulaire afhankelijkheden op te sporen voordat deze in productie gaan.

### ESLint `no-restricted-paths`

Onze gedeelde ESLint configuratie dwingt de eenrichtingsafhankelijkheidsstroom af. Als u probeert te importeren uit een pakket dat
moet "boven" de jouwe zijn in de hiërarchie, dan zal de linter een foutmelding geven.

Voer de linter uit om te controleren op overtredingen:

```bash
pnpm lint
```

### Handmatige audit met Madge

Voor complexe cycli die meerdere bestanden bestrijken, kunt u gebruik maken van `madge` (indien geïnstalleerd) of vergelijkbare visualisaties om de
afhankelijkheidsgrafiek.

## How-to: circulaire afhankelijkheden oplossen

Wanneer er een circulaire afhankelijkheid wordt gedetecteerd, gebruikt u een van de volgende strategieën om deze op te lossen.

### Strategie 1: gedeelde code extraheren (aanbevolen)

Als pakket A en pakket B beide een gemeenschappelijk stukje logica nodig hebben, verplaats die logica dan naar een nieuw pakket op een lager niveau (bijv.
`packages/utils-shared`).

**Voor**:

- Pakket A ↔ Pakket B

**Na**:

- Pakket A → Pakket C
- Pakket B → Pakket C

### Strategie 2: Omkering van afhankelijkheid

In plaats van dat Pakket B rechtstreeks uit Pakket A importeert, kunt u Pakket B de vereiste functionaliteit als hulpmiddel laten accepteren, a
configuratieobject of via een gebeurtenisbus.

**Voorbeeld**:
In plaats van `AuthService` importeren `UserService` een profiel bijwerken, `AuthService` kan een uitzenden `AUTH_SUCCESS` evenement
dat `UserService` luistert naar.

### Strategie 3: Consolidatie

Als twee pakketten zo nauw met elkaar verbonden zijn dat ze voortdurend elkaars interne onderdelen nodig hebben, kunnen ze feitelijk een
één logische eenheid. Overweeg om ze samen te voegen tot één pakket.

## Beste praktijken op het gebied van preventie

1. **Volg de eenrichtingsverkeer**: houd u strikt aan de `Apps → Packages → Configs` afhankelijkheid richting.
2. **Auteur Framework-neutrale logica**: gebruik `@mission-platform/forge` voor kernlogica om raamwerkspecifieke cycli te vermijden.
3. **Gebruik werkruimteprotocollen**: altijd gebruiken `workspace:*` om de interne afhankelijkheden te waarborgen pnpm correct kan oplossen
   de grafiek.
4. **Controleer imports regelmatig**: let op de suggesties voor automatisch importeren in uw IDE, aangezien deze soms
   onbedoelde afhankelijkheden tussen pakketten.

## Gerelateerde documentatie

- [Beste praktijken](best-practices.md)
- [Structuur van de werkruimte](workspace-structure.md)
- [Gids voor probleemoplossing](troubleshooting.md)
