# Model- en kostenstrategie - Volledige dekking van het ZXING-corpus

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/code-scanner/docs/model-cost-strategy.md: [packages/code-scanner/docs/model-cost-strategy.md](../../model-cost-strategy.md)
> Taal: Nederlands (nl)

Dit document bevat de **model-tiering matrix** die is aangevraagd voor het ZXING black-box corpuswerk ("gebruik agenten van
verschillende modellen om te bepalen hoe dit het beste kan worden bereikt tegen de meest effectieve kosten"). Er wordt vastgelegd welk modelniveau het beste is
geschikt voor elke opleveringsfase, zodat overal waar een delegatiemechanisme bestaat het werk naar de goedkoopste kan worden gerouteerd
capabele laag – en waar één enkele agent het werk doet, begeleidt deze waar de meeste inspanning (en het meest capabele model)
moet worden besteed.

## Definities van niveaus

- **Niveau A (top/meest capabel)** — nieuwe computervisie-redenering en spec-zware decodering: de nieuwe locators (MaxiCode
  zeshoekig raster + bullseye, PDF417 rijclustering, GS1 DataBar gestapelde rij-assemblage) en de Reed-Solomon /
  foutcorrectiewiskunde (GF (929) voor PDF417, GF (64) voor MaxiCode, de RSS-combinatoriek). Dit zijn de meest onderdelen
  waarschijnlijk op subtiele manieren ongelijk hebben en het moeilijkst te herstellen zijn van een slechte eerste versie.
- **Tier B (midden)** — goed gespecificeerde overdracht van de ZXING-referentie: symbologietabellen, encoders, round-trip gegenereerd
  tests, harnaslogica en de generalisatie van de PNG-lader. De vorm van het antwoord is bekend; het werk is zorgvuldig
  transcriptie en bedrading.
- **Tier C (goedkoop/mechanisch)** — bulkkopie, attributiebestanden, basislijnsteigers, documenten en de boilerplate van de bedrading
  (formaattags, `FORMAT_NAMES`, de `ScanFormat`-unie).

## Fase → niveautoewijzing

| Fase                                                | Werk                                                    | Niveau |
| --------------------------------------------------- | ------------------------------------------------------- | ------ |
| 1 Leverancierscorpus + lader + harnas               | kopie/toeschrijving (C), lader + harnaslogica (B)       | C → B  |
| 2 Verhoog de leessnelheid van ondersteunde formaten | locator afstemmen + paden opnieuw proberen              | A → B  |
| 3 GS1 DataBar-familie                               | tabellen/encoders (B), RSS-14-locator + RS (A)          | A/B    |
| 4 PDF417                                            | tabellen/encoder (B), rijscanlocator + GF(929) EC (A)   | A/B    |
| 5 MaxiCode                                          | hex-rasterzoeker + GF(64) RS (A), tabellen (B)          | A/B    |
| 6 Wire-up + JS + documenten                         | boilerplate/docs + bedrading (C), wasrevisie + rook (B) | C → B  |

## Kostenprincipe

Maximaliseer het Tier-C/Tier-B-aandeel: de mechanische portering (tabellen, encoders, round-trip tests, bedrading) vormt het grootste deel van
het nieuwe formaat werk – en reserveer het Tier-A-budget voor de drie werkelijk nieuwe locators en hun foutcorrectie
wiskunde, waarbij de fouten van een zwakker model duur zijn om te detecteren en op te lossen. Een korte piek kan een goedkoper model benchmarken
één decoderpoort voordat u de laag voor de rest vastlegt.

## Hoe het zich afspeelde

- **Fase 6** (deze fase) is het duidelijkste Tier-C → B-geval: uitbreiding
  `FORMAT_NAMES` en de `ScanFormat`-verbinding zijn mechanisch (C); het opnieuw opbouwen van de was en het schrijven van de upload/stream smoke
  suite met een kleine PNG-lezer is goed gespecificeerd werk uit het middensegment (B). Er was geen Tier-A-redenering meer nodig als de autochtoon eenmaal geboren was
  decoders (fasen 3–5) waren aanwezig.
- **Fase 3-5** zijn elk netjes opgesplitst: de ZXING-tabellen/encoders en round-trip-tests waren Tier-B-transcriptie, terwijl de
  locators en Reed-Solomon (GF (929), GF (64), de RSS-combinatoriek) waren de Tier-A-kern - consistent met de matrix
  hierboven.

> Tijdens de implementatie was er geen tool voor het delegeren van aangepaste agenten beschikbaar, dus a
> één agent voerde het werk uit en besteedde er moeite aan volgens deze matrix. De
> matrix blijft de leidraad voor toekomstige herhalingen waarbij delegatie naar meerdere wordt uitgevoerd
> modellagen zijn mogelijk.
