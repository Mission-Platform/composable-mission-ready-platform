# Migreer naar de FWS-pijplijn die standaard veilig is

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/flint/core/docs/guides/migration-v1.md: [packages/flint/core/docs/guides/migration-v1.md](../../../guides/migration-v1.md)
> Taal: Nederlands (nl)

Deze gids is bedoeld voor FWS-modules die zijn geschreven voor onveranderlijke lokale bewoners, expliciete leningen,
en gecontroleerde metagegevens over het grenzenbeleid werden onderdeel van het v1-contract.

## Maak mutatie expliciet

Voeg `mut` toe aan de lokale waarden en parameters die zijn toegewezen. Voeg `&` toe voor een onveranderlijk bestand
lenen en `&mut` voor een veranderlijke lening; veranderlijke leningen kunnen elkaar niet overlappen.

```flint
fn increment(mut value: i32) -> i32 {
  value = value + 1;
  value
}

fn inspect(values: &Vector<i32>) -> i32 { values[0] }
fn update(values: &mut Vector<i32>) -> unit { values[0] = 1; }
```

Vertrouw niet op afgeleid eigendom. POD-waarden worden standaard per waarde doorgegeven;
niet-POD-waarden gebruiken onveranderlijke referenties. Behoud `owned`, `borrowed` en `shared`
op ABI-grenzen waar een specifieke levenslange of vrijlatingsverantwoordelijkheid geldt
vereist. Een tijdelijke regio kan niet worden geretourneerd of opgeslagen in een langere levensduur
waarde zonder expliciete eigendoms-/promotiegrens.

## Kies en controleer het grenzenbeleid

Controles op de runtimegrenzen blijven de standaard:

```bash
flint compile src/main.flint --bounds-checks runtime --format json
```

Gebruik `proven-safe` alleen wanneer analyse elke toegang vanaf de lengte van de verzameling aantoont
en feiten over het indexbereik. `excluded-by-profile` is een expliciete, controleerbare release
keuze, geen snelkoppeling voor onbekende indexen:

```bash
flint check src/main.flint --bounds-checks proven-safe --optimizer-report
```

Controleer de analyseresultaten en het manifestbeleid vóór verzending. Onbekend of
niet-vertrouwde indexen moeten `runtime` gebruiken; strikte analyse wijst onveilig beleid af
verzoeken.

## Inspecteer de gegenereerde cache-metagegevens

De cache van de compiler kan `<key>.sonir.json` bevatten, een deterministische samenvatting van
de geoptimaliseerde Sea-of-Nodes-grafiek. Inspecteer het zonder de gastcode uit te voeren:

```bash
flint inspect-sonir .cache/main.sonir.json --format json
```

Het artefact registreert schema- en taal-/ABI-versies, bron- en grafiekhashes,
optimalisatiemodus, grenzenbeleid, effecten, metagegevens over eigendom, bronbereiken,
en bestelde pasrapporten. Verouderd, misvormd, te groot of niet passend bij het beleid
artefacten worden genegeerd en kunnen veilig worden verwijderd.

## Strikt statisch typen en afwezigheid van dynamische typen

Flint is een statisch getypeerde taal met een deterministische geheugenindeling en geen runtime-reflectie-overhead. De taal ondersteunt geen dynamische toptypen zoals `any` of `unknown`.

Als u probeert typen te annoteren met `any` of `unknown`, ontstaat er tijdens het compileren een diagnose `FLINT-TYPE-020`. Om code uit dynamische omgevingen te migreren:

- Vervang dynamische waarden door concrete primitieven (`i32`, `u32`, `f64`, `bool`, `string`, `bytes`).
- Gebruik parametrisch polymorfisme / generieke methoden (`Vector<T>`, `Option<T>`, `Result<T, E>`) voor herbruikbare containeralgoritmen.
- Gebruik getagde algebraïsche gegevenstypen (`enum`) voor polymorfe domeinrepresentaties.
- Voor C ABI-pointers en ondoorzichtige host-handles declareert u `opaque foreign type Handle;` in plaats van ongetypeerde pointers.
- Geef in Web IDL-bridges en -bindingen expliciete typetoewijzingen op via `FlintBindingOptions.customTypeMappings`.

## Geheugen- en releasegedrag

Bereikte waarden gebruiken aangevinkte regio's. Waarden die een regio overleven, gebruiken expliciet
ARC/gedeelde handvatten; elke vastgehouden handgreep heeft één bijpassende ontgrendeling en cycli
worden niet impliciet aanvaard. Ruwe `fws_alloc`, `fws_realloc` en `fws_dealloc`
blijft de gecontroleerde ABI-grens die eigendom is van de beller. Asynchrone en iteratoropschorting is dat wel
een ontsnappingsgrens, dus waarden die na opschorting worden gebruikt, moeten expliciet worden behouden.
