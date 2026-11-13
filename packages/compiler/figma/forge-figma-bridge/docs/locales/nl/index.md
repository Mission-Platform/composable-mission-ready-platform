# Smeed de Figma-opslagbrug

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/compiler/figma/forge-figma-bridge/docs/index.md: [packages/compiler/figma/forge-figma-bridge/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

De bridge accepteert een beoordeelde `ForgeRepositoryExportRequest` in plaats van een geverifieerde `POST /export` en schrijft de bundel naar een van de expliciet geconfigureerde repositoryroots. Configureer rooten met de `--root <id>=<absolute-path>`-optie van de CLI.

Bij elk serverproces wordt een nieuw authenticatietoken gemaakt. De CLI drukt het token af ​​wanneer deze start; bellers moeten het verzenden als `Authorization: Bearer <token>` en de standaardoorsprong `https://www.figma.com` verzenden. De oorsprong kan worden gewijzigd voor een expliciet geconfigureerde lokale integratie met de serveroptie `allowedOrigin`. Verzoeken van andere oorsprong en verzoeken zonder het token worden afgewezen voordat de bundel wordt gelezen of geschreven.
