# Übersicht über die Missionsplattform

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/overview.md: [docs/overview.md](../../overview.md)
> Sprache: Deutsch (de)

Mission Platform ist eine zusammensetzbare, paketgesteuerte, Framework-neutrale Komponentenplattform für den Bau
produktionsreife Anwendungen mit wiederverwendbaren Bausteinen. Es nutzt eine moderne Monorepo-Architektur, um eine bereitzustellen
hocheffiziente Entwicklungsumgebung für komplexe Ökosysteme mit mehreren Anwendungen.

## Die komponierbare Philosophie

Im Kern basiert Mission Platform auf dem Prinzip **Komposition vor Vererbung**. Anstatt eine bereitzustellen
Als monolithisches Framework, das die Anwendungsstruktur vorgibt, bietet die Plattform eine Reihe kleiner, fokussierter und hochentwickelter
interoperable Pakete.

### Zusammensetzbare Bausteine

Anwendungen werden aus gemeinsam genutzten Paketen zusammengestellt und stellen so eine gemeinsame Logik sicher – von UI-Komponenten bis hin zur Internationalisierung
und Routing – wird einmal erstellt und überall wiederverwendet. Dieser Ansatz reduziert Duplikate, vereinfacht die Wartung und
sorgt für ein konsistentes Benutzererlebnis in der gesamten Produktsuite.

### Multi-Framework von Design

Mission Platform führt ein Framework-neutrales Entwicklungsparadigma ein. Mit dem `@mission-platform/forge-jsx` JSX-Dialekt,
Entwickler können Komponenten einmal erstellen und sie zu nativen Ausgaben für Vue 3, React, Solid, Svelte und Web kompilieren
Komponenten. Dies macht die Codebasis zukunftssicher und ermöglicht eine nahtlose Integration in verschiedene Frontend-Umgebungen.

### Typsichere Stiftung

Die gesamte Plattform ist in **TypeScript** erstellt und bietet ein robustes, selbstdokumentierendes Entwicklererlebnis. Explizit
Durch die Eingabe über alle öffentlichen APIs hinweg wird sichergestellt, dass Fehler zur Kompilierungszeit erkannt werden, was die Entwicklung erheblich steigert
Geschwindigkeit und Codequalität.

## Hauptmerkmale

| Funktion | Beschreibung |
|:----------------------|:---------------------------------------------------------------------------------------------------------------------------------------|
| **Forge JSX Runtime** | Ein Framework-neutraler JSX-Dialekt: Einmal erstellen und für Vue 3, React, Svelte, Solid und Webkomponenten ohne Laufzeitaufwand erstellen. |
| **Komponentenbibliothek** | Ein umfassender Satz an Layout-, Typografie- und interaktiven Komponenten, die einmal für mehrere Frameworks erstellt wurden.                           |
| **Design-Token** | Ein DTCG-kompatibles Token-System, das SCSS- und TypeScript-Artefakte für ein konsistentes Design generiert.                                     |
| **Agnostisches Routing** | Ein typsicheres Routingsystem, das unabhängig vom UI-Framework funktioniert.                                                               |
| **Universal I18n** | Ein Framework-unabhängiger Internationalisierungs-Wrapper basierend auf i18next mit dedizierten Vue- und React-Adaptern.                              |
| **Wasm-Dienstprogramme** | Leistungsstarke Dienstprogramme zum Barcode-Scannen, zur Rechtschreibprüfung und mehr, unterstützt von WebAssembly.                                     |

## Technologie-Stack

Mission Platform basiert auf einem modernen, leistungsstarken Stack:

- **Forge JSX (`@mission-platform/forge-jsx`)**: Das primäre UI-Framework – eine Framework-neutrale JSX-Laufzeit, in der alle
  Gemeinsam genutzte Komponenten (alles außer den Apps) werden erstellt.
- **Vue 3**: Das Framework, mit dem die Anwendungen in `apps/` erstellt werden, und eines von mehreren nativen Renderzielen für
  Schmiedekomponenten.
- **TypeScript**: Der Standard für den gesamten Quellcode.
- **Vite**: Das Build-Tool für schnelles HMR und optimierte Produktionspakete.
- **pnpm Arbeitsbereiche**: Effizientes Abhängigkeitsmanagement mit gemeinsam genutzten Sperrdateien.
- **Turborepo**: Hochleistungs-Aufgaben-Orchestrierung und Caching.
- **Cloudflare Workers/Pages**: Das primäre Bereitstellungsziel für Anwendungen und APIs.
- **Storybook**: Die Werkbank für Komponentenentwicklung und visuelle Tests.

## Ökosystemstruktur

Das Repository ist in mehrere unterschiedliche Bereiche unterteilt:

- **`apps/`**: Bereitstellbare Anwendungen (z. B. `my-care-notes`, `website`), die Pakete zu Produkten zusammenstellen.
- **`packages/`**: Die Kernbausteine, einschließlich `@mission-platform/components`, `@mission-platform/router` und
  `@mission-platform/i18n`.
- **`packages/tooling/configs/`**: Gemeinsame Konfigurationen für ESLint, Prettier, TypeScript und Vite.
- **`packages/tooling/vite/`**: Benutzerdefinierte Build-Time-Tools für Design-Tokens, Forge-Kompilierung und SEO.
- **`packages/edge/workers/`**: Cloudflare-Worker, die Backend-Logik und SPA-Bereitstellungsfunktionen bereitstellen.

## Nächste Schritte

Um mit der Entwicklung auf der Mission Platform zu beginnen, lesen Sie bitte die folgenden Leitfäden:

- **[Entwicklungs-Setup](development-setup.md)**: Bereiten Sie Ihre Umgebung vor und installieren Sie Abhängigkeiten.
- **[Architektur](architecture.md)**: Tauchen Sie tief in die Designprinzipien und den Abhängigkeitsfluss der Plattform ein.
- **[Arbeitsbereichsstruktur](workspace-structure.md)**: Verstehen Sie das Verzeichnislayout und die Paketkonventionen.
- **[Testen](testing.md)**: Erfahren Sie mehr über unsere Teststrategien und -tools.
