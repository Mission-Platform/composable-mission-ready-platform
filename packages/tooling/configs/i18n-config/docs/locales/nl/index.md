# @mission-platform/i18n-config

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/tooling/configs/i18n-config/docs/index.md: [packages/tooling/configs/i18n-config/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Gedeelde landinstelling en extractieconfiguratie voor Mission Platform-werkruimten.

## Installeren en gebruiken

Voeg dit pakket toe als ontwikkelingsafhankelijkheid bij het configureren van i18next of
vertaling extractie:

```bash
pnpm add --save-dev @mission-platform/i18n-config
```

Bewaar landinstellingen naast de werkruimte waarvan ze eigenaar zijn. Extractie schrijft
naamruimtebundels onder de eigen werkruimte `locales/<locale>/` map;
de opdracht op repositoryniveau orkestreert alle geconfigureerde werkruimten.

## Bijdragen

Voer de pakketlint- en opmaakcontroles uit voordat u deze publiceert. Plaats geen pakket of
vertaalinhoud van applicaties in dit configuratiepakket.
