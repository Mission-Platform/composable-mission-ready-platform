# @mission-platform/typescript-config

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/tooling/configs/typescript-config/docs/index.md: [packages/tooling/configs/typescript-config/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Gedeelde TypeScript-presets voor elke Mission Platform-werkruimte.

## Installeren en gebruiken

```bash
pnpm add --save-dev @mission-platform/typescript-config
```

Breid de overeenkomende voorinstelling uit `tsconfig.json` uit: gebruik `app` voor Vue-apps,
`react` voor React apps, `library` voor pakketdeclaraties, `node` voor tooling,
en `test` voor Vitest-specificaties. Kaderconsumenten zouden de matching ook moeten gebruiken
`framework-<name>` voorinstelling met aangepaste staat. Zie het pakket README voor de
complete preset-tabel en voorbeelden.

## Bijdragen

Bewaar gedeelde compilervlaggen in de voorinstellingen. Rennen
`pnpm --filter @mission-platform/typescript-config build:check` en formaat
controles nadat u er een hebt gewijzigd.
