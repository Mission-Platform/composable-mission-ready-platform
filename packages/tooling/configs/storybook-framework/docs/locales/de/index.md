# @mission-platform/storybook-framework

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/tooling/configs/storybook-framework/docs/index.md: [packages/tooling/configs/storybook-framework/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Von der Umgebung ausgewähltes Storybook-Framework, voreingestellt für Mission Platform.

## Installieren und verwenden

Fügen Sie das Paket zum Storybook-Arbeitsbereich hinzu und verweisen Sie darauf
`.storybook/main.ts` oder die entsprechende Storybook-Konfiguration. Wählen Sie die aus
Rahmen durch die unterstützten Bedingungen des Arbeitsbereichs; a nicht fest codieren
Framework-Adapter in gemeinsam genutzten Komponentenpaketen.

## Beitragen

Laufen `pnpm --filter @mission-platform/storybook-framework lint` und die
Überprüfung des Storybook-Builds. Konzentrieren Sie sich in diesem Paket auf die Auswahl des Frameworks und
gemeinsame Storybook-Standardeinstellungen; Komponentengeschichten gehören hinein `apps/storybook`.
