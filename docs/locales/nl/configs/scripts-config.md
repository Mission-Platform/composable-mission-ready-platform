# Gedeelde hulpprogrammascripts

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/configs/scripts-config.md: [docs/configs/scripts-config.md](../../../configs/scripts-config.md)
> Taal: Nederlands (nl)

Deze handleiding blijft opzettelijk in de projectdocumentatielaag: `scripts/`
bevat repository-orkestratie in plaats van een publiceerbaar werkruimtepakket.
Pakket- en applicatiespecifieke opdrachten blijven gedocumenteerd naast hun
werkruimte bezitten.

Het Mission Platform onderhoudt een reeks gedeelde hulpprogrammascripts in de root
`scripts/` map, beheerd door de root-werkruimtetooling.

## Overzicht

Deze scripts automatiseren algemene monorepo-taken, zoals het instellen van lokale ontwikkeling en buildverificatie. Vertaling
extractie wordt gedefinieerd door elke app of pakket en georkestreerd vanuit de root van de repository met Turborepo.

## Beschikbare scripts

### i18n Extractie (`i18n:extract`)

Elke app of elk pakket dat vertalingen bezit, biedt een `i18n:extract` schrift en `i18next.config.ts`. Het commando schrijft
naamruimtebundels onder elke werkruimte `locales/<locale>/` map. Voer extractie uit voor alle geconfigureerde werkruimten van
de root van de repository:

```bash
pnpm i18n:extract
```

### Ontwikkelaarscertificaat genereren (`generate-dev-cert.ts`)

Genereert lokale SSL/TLS-certificaten voor HTTPS-ontwikkeling. Dit is handig voor het testen van functies waarvoor een beveiliging vereist is
context (bijvoorbeeld cameratoegang via `@mission-platform/code-scanner`).

```bash
pnpm exec tsx scripts/generate-dev-cert.ts
```

### Kaderresolutieverificatie (`verify-framework-resolution.mjs`)

Bevestigt dat `@mission-platform/*` pakketexports worden correct omgezet in de beoogde framework-build (Vue, Reactenz.)
gebaseerd op de exportvoorwaarden van het milieu.

```bash
node scripts/verify-framework-resolution.mjs
```

## Uitvoeringsmethoden

### Via Pakketbeheer

De meeste scripts zijn beschikbaar als `pnpm` scripts in de root `package.json`:

```bash
pnpm run <script-name>
```

### Directe uitvoering

Individueel TypeScript scripts kunnen worden uitgevoerd met `tsx` of `node --experimental-strip-types`:

```bash
pnpm exec tsx scripts/<filename>.ts
```

## Richtlijnen voor bijdragen

Wanneer u een nieuw gedeeld script toevoegt:

- Plaats het in de `scripts/` map.
- Gebruik TypeScript waar mogelijk.
- Als het script afhankelijk is van externe pakketten, voeg deze dan toe aan de eigen werkruimte `package.json`.
- Documenteer het doel en gebruik van het script in dit bestand.
- Voeg een corresponderend item toe in de root `package.json` als het een vaak gebruikt hulpprogramma is.
