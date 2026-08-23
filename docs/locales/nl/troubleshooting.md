# Gids voor probleemoplossing

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/troubleshooting.md: [docs/troubleshooting.md](../../troubleshooting.md)
> Taal: Nederlands (nl)

Deze gids biedt oplossingen voor veelvoorkomende problemen die zich voordoen tijdens de ontwikkeling, bouw en implementatie binnen de missie
Platform monorepo. Het is gestructureerd als een **handleiding** voor het diagnosticeren en oplossen van technische problemen.

## Prestatieproblemen

### Langzame LCP (grootste inhoudsvolle verf)

**Probleem**: LCP ligt boven de drempel van 2,5 seconden voor een beoordeling 'Goed'.

**Diagnose**:

1. Voer een Lighthouse-audit uit in Chrome DevTools.
2. Identificeer het LCP-element in het paneel "Prestaties".
3. Controleer het tabblad "Netwerk" op vertragingen bij het laden van bronnen.

**Oplossingen**:

- **Inline kritische CSS**: zorg ervoor dat de stijlen die vereist zijn voor inhoud boven de vouw, inline zijn.
- **Beeldoptimalisatie**: gebruik WebP/AVIF-formaten en bied `srcset` aan voor responsieve afbeeldingen.
- **Vooraf laden van bronnen**: gebruik `<link rel="preload">` voor de LCP-image of kritische lettertypen.
- **Minimaliseer hoofdthreadwerk**: stel niet-essentiële JavaScript uit met `async` of `defer`.

### Geheugenlekken

**Probleem**: de applicatie verbruikt in de loop van de tijd steeds meer geheugen, wat uiteindelijk tot crashes kan leiden.

**Diagnose**:

1. Maak meerdere "Heap Snapshots" op het tabblad Chrome DevTools Memory.
2. Vergelijk momentopnamen om objecten te identificeren die in aantal of omvang groeien.
3. Zoek naar "Vrijstaande DOM-elementen".

**Oplossingen**:

- **Opschonen in Composables**: timers altijd wissen en gebeurtenislisteners verwijderen in `onUnmounted`.
- **Winkelbeheer**: Zorg ervoor dat de reactieve status in Pinia of andere winkels wordt gewist wanneer deze niet langer nodig is.
- **Gooi Observables weg**: Als u RxJS gebruikt, zorg er dan voor dat alle abonnementen zijn uitgeschreven.

## Problemen met bouwen en werkruimte

### Turborepo-cachefouten

**Probleem**: wijzigingen worden niet doorgevoerd in de build, of de build mislukt met verouderde artefacten.

**Oplossing**: Forceer een nieuwe build door de cache te omzeilen of deze handmatig te wissen.

```bash
# Force a build without cache
pnpm build:force

# Manually clear the turbo cache
rm -rf .turbo
```

### Module niet gevonden / Werkruimteresolutie

**Probleem**: TypeScript of Vite kan geen pakket vinden dat in de werkruimte is gedefinieerd.

**Oplossingen**:

1. Controleer of het pakket wordt vermeld in de `package.json` van de verbruikende werkruimte.
2. Zorg ervoor dat de versie overeenkomt (`workspace:*` wordt aanbevolen).
3. Voer `pnpm install` uit om symlinks te vernieuwen.
4. Als het probleem aanhoudt, probeer dan een grondige reiniging:
```bash
   pnpm -r exec rm -rf node_modules
   pnpm install
   ```

### Type fouten in CI maar niet lokaal

**Probleem**: Build mislukt in CI met TypeScript-fouten die niet verschijnen in uw IDE.

**Oplossing**: voer de typecontrole lokaal uit in de gehele werkruimte.

```bash
pnpm exec turbo run build:check
```

Dit zorgt ervoor dat alle pakketgrenzen correct worden gerespecteerd en dat typen netjes worden gevalideerd.

## Problemen met MCP-server oplossen

### Kan geen verbinding maken

**Probleem**: uw AI-client of IDE kan geen verbinding maken met de Mission Platform MCP-server.

**Diagnose**:

1. Controleer of de MCP-server is gebouwd: `pnpm exec turbo run build --filter @mission-platform/mcp-*`.
2. Controleer of de server handmatig start: `node mcp/developer/dist/index.js`.

**Oplossingen**:

- Zorg ervoor dat u het absolute pad naar het binaire bestand node en het script in uw clientconfiguratie gebruikt.
- Controleer de MCP-serverlogboeken op specifieke foutmeldingen (bijvoorbeeld ontbrekende omgevingsvariabelen).

## Veelvoorkomende foutpatronen

### "Kan eigenschap van ongedefinieerd niet lezen"

**Oorzaak**: toegang tot eigenschappen van een null- of ongedefinieerd object, vaak voordat de gegevens volledig zijn geladen. **Oplossing**: Gebruik
optionele ketening (`?.`) of geef standaardwaarden op.

```typescript
// Instead of:
const name = user.profile.name;

// Use:
const name = user?.profile?.name ?? 'Guest';
```

### "Onverwerkte belofte afwijzing"

**Oorzaak**: een asynchrone functie heeft een fout gegenereerd die niet is opgemerkt. **Opgelost**: verpak asynchrone oproepen altijd in `try/catch`-blokken.

```typescript
try {
  await fetchData();
} catch (error) {
  handleError(error);
}
```

## Gerelateerde bronnen

- [Beste praktijken](best-practices.md)
- [Ontwikkeling instellen](development-setup.md)
- [Gids voor testen](testing.md)
