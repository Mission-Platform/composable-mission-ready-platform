# Forge Figma-Repository-Brücke

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/compiler/figma/forge-figma-bridge/docs/index.md: [packages/compiler/figma/forge-figma-bridge/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Die Bridge akzeptiert ein überprüftes `ForgeRepositoryExportRequest` über ein authentifiziertes `POST /export` und schreibt das Bundle in einen ihrer explizit konfigurierten Repository-Roots. Konfigurieren Sie Roots mit der Option `--root <id>=<absolute-path>` der CLI.

Jeder Serverprozess erstellt ein neues Authentifizierungstoken. Die CLI druckt das Token beim Start aus; Anrufer müssen es als `Authorization: Bearer <token>` und den Standardursprung `https://www.figma.com` senden. Der Ursprung kann für eine explizit konfigurierte lokale Integration mit der Serveroption `allowedOrigin` geändert werden. Anfragen von anderen Ursprüngen und Anfragen ohne das Token werden abgelehnt, bevor das Bundle gelesen oder geschrieben wird.
