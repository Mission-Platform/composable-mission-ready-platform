# Gedeelde hulpprogrammascripts

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/configs/scripts-config.md: [docs/configs/scripts-config.md](../../../configs/scripts-config.md)
> Taal: Nederlands (nl)

Deze handleiding blijft opzettelijk in de projectdocumentatielaag: `scripts/`
is een privéwerkruimtepakket dat repositoryorkestratie bevat in plaats van een
publiceerbare bibliotheek.
Pakket- en applicatiespecifieke opdrachten blijven gedocumenteerd naast hun
werkruimte bezitten.

Het Mission Platform onderhoudt een reeks gedeelde hulpprogrammascripts in de root
`scripts/`-map. Hun pakketscripts zijn geregistreerd als Turbo-taken, terwijl
de root `package.json` stelt gemakswrappers bloot die delegeren aan Turbo.

## Overzicht

Deze scripts automatiseren algemene monorepo-taken, zoals het instellen van lokale ontwikkeling en buildverificatie. Vertaling
extractie wordt gedefinieerd door elke app of pakket en georkestreerd vanuit de root van de repository met Turborepo.

## Beschikbare scripts

### Turbo taakfamilies

Gebruik de root-wrappers voor de onderstaande repositoryhulpprogramma's. Elke opdracht is een
afzonderlijke taak, zodat Turbo deze onafhankelijk kan hashen en plannen:

| Commando | Doel | Cachebeleid |
| :----------------------------------- | :---------------------------------------------------------------- | :---------------------------------------------------------- |
| `pnpm validate` | Voer de zelfstandige statische controle van de componenteigenschappen uit via Turbo. | De taak wordt onafhankelijk in de cache opgeslagen.                           |
| `pnpm docs:generate` | Genereer referentiedocumentatie voor pakketten en extensies.           | Gegenereerde referentiebestanden worden in de cache opgeslagen.                       |
| `pnpm validate:exports` | Controleer pakketexportkaarten en gebouwde doelen.                     | Kan in de cache worden opgeslagen als de invoer ongewijzigd blijft.                    |
| `pnpm validate:component-properties` | Controleer de verklaringen van componenteigenschappen aan de hand van bronstijlen.      | Cachebaar en uitvoervrij.                                  |
| `pnpm validate:inventory` | Produceer de runtime-validatie-inventaris.                         | Cachebare artefacten onder `.artifacts/runtime-validation/`. |
| `pnpm validate:framework` | Valideer de runtimedekking van het raamwerk.                              | Cachebare artefacten onder `.artifacts/runtime-validation/`. |
| `pnpm validate:app` | Valideer de runtimedekking van de applicatie.                            | Cachebare artefacten onder `.artifacts/runtime-validation/`. |
| `pnpm validate:target` | Valideer geconfigureerde Storybook-doelen.                            | Cachebare artefacten onder `.artifacts/runtime-validation/`. |
| `pnpm validate:runtime` | Voer de volledige runtime-validatiesuite uit.                            | Niet in de cache opgeslagen omdat externe runtime-processen worden gestart.    |
| `pnpm visual:parity` | Vergelijk de gerenderde Storybook-uitvoer in verschillende frameworks.              | Niet in de cache opgeslagen omdat ontwikkelingsservers worden gestart.           |
| `pnpm test:runtime-validation` | Voer de gerichte runtime-validatie-eenheidstests uit.                    | Cachebaar volgens de invoer van de testtaak.                |

De invoer van de hulpprogrammataken wordt gedeclareerd in `turbo.json`; gebruik van inputs in de hele repository
`$TURBO_ROOT| `pnpm test:runtime-validation` | Voer de gerichte runtime-validatie-eenheidstests uit.                    | Cachebaar volgens de invoer van de testtaak.                |

De invoer van de hulpprogrammataken wordt gedeclareerd in `turbo.json`; gebruik van inputs in de hele repository
 zodat ze correct blijven wanneer de taak wordt uitgevoerd vanuit `scripts/`
werkruimte. Gegenereerde runtime en visuele artefacten worden hieronder geschreven
`.artifacts/` en worden niet behandeld als broninvoer.

`pnpm validate:exports` is met opzet een aparte post-build-poort omdat het
controleert bestanden in pakket-`dist/`-mappen. Voer het uit na `pnpm build`, als de
Chromatische statische poorten doen dat wel.
 `$TURBO_ROOT$`
### i18n-extractie (`i18n:extract`)

Elke app of elk pakket dat eigenaar is van vertalingen, biedt een `i18n:extract`-script en `i18next.config.ts`. Het commando schrijft
naamruimtebundels onder de map `locales/<locale>/` van elke werkruimte. Voer extractie uit voor alle geconfigureerde werkruimten van
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

### Verificatie van raamwerkresolutie (`verify-framework-resolution.mjs`)

Controleert of de `@mission-platform/*`-pakketexports correct worden omgezet in de beoogde framework-build (Vue, React, enz.)
gebaseerd op de exportvoorwaarden van het milieu.

```bash
node scripts/verify-framework-resolution.mjs
```

### Documentatie genereren (`docs:generate`)

Het genereren van documentatie is een Turbo-taak die eigendom is van `@mission-platform/scripts`.
De docs-applicatie is expliciet van die taak afhankelijk, dus ontwikkelen en bouwen
opdrachten starten geen geneste Turbo-build.

## Uitvoeringsmethoden

### Via Pakketbeheer

Veelgebruikte hulpprogramma's zijn beschikbaar als door Turbo ondersteunde `pnpm`-scripts in de
root `package.json`:

```bash
pnpm run <script-name>
```

Voor een pakketgerichte aanroep gebruikt u Turbo rechtstreeks:

```bash
pnpm exec turbo run validate:exports --filter=@mission-platform/scripts
```

### Directe uitvoering

Individuele TypeScript-scripts kunnen worden uitgevoerd met `tsx` of `node --experimental-strip-types`:

```bash
pnpm exec tsx scripts/<filename>.ts
```

## Richtlijnen voor bijdragen

Wanneer u een nieuw gedeeld script toevoegt:

- Plaats het in de map `scripts/`.
- Gebruik TypeScript waar mogelijk.
- Als het script afhankelijk is van externe pakketten, voeg deze dan toe aan `package.json` van de werkruimte die er eigenaar van is.
- Documenteer het doel en gebruik van het script in dit bestand.
- Voeg een corresponderend item toe in de root `package.json` als het een vaak gebruikt hulpprogramma is.
