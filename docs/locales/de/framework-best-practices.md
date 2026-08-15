# Best Practices für Frameworks

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> Englische Quelle: [docs/framework-best-practices.md](../../framework-best-practices.md)
> Sprache: Deutsch (de)

Dieses Dokument bietet Anleitungen zu idiomatischen Mustern, Reaktivitätsmodellen und Leistungsoptimierungen für die von der Mission Platform unterstützten Frameworks. Es dient als **Erläuterung** unserer Multi-Framework-Strategie und als Referenz für die Framework-spezifische Entwicklung.

## Multi-Framework-Strategie

Die Kernphilosophie der Mission Platform besteht darin, einmal zu erstellen und überall zu rendern. Dies wird erreicht durch **@mission-platform/forge**, das primäre Framework der Plattform: eine Framework-neutrale JSX-Laufzeit, in der alle gemeinsam genutzten Komponenten (alles außer den Apps) erstellt und von der aus sie nahtlos gerendert werden Vue 3, Reactund andere unterstützte Umgebungen.

### Der Forge-Dialekt
Erstellen Sie beim Erstellen gemeinsam genutzter Pakete Komponenten mithilfe der neutralen Grundelemente von Forge:
- **JSX Factory**: Verwenden `h` Und `Fragment` aus `@mission-platform/forge`.
- **Neutrale Haken**: Verwenden `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`, Und `useId`.
- **Primitive**: Verwenden `Slot`, `Teleport`, `Transition`, Und `Dynamic` für komplexe UI-Strukturen.

## Vue 3

Vue 3 ist das Framework, in dem sich die Anwendungen befinden `apps/` werden mit erstellt und sind das primäre native Renderziel für Forge-Komponenten. Gemeinsam genutzte Komponenten selbst werden in Forge JSX erstellt und nicht direkt in Vue.

### Idiomatische Muster
- **Kompositions-API**: Verwenden `<script setup lang="ts">` für alle neuen Komponenten.
- **Forge-Integration**: Neutrale Komponenten mit umwickeln `toVueComponent` aus `@mission-platform/forge/vue`.
- **Composables**: Zustandsbehaftete Logik extrahieren in `useXxx` Funktionen zur Förderung der Wiederverwendbarkeit.

### Leistungsoptimierungen
- **Geringe Reaktivität**: Verwenden `shallowRef` oder `shallowReactive` für große, komplexe Datensätze, um Proxy-Overhead zu vermeiden.
- **v-memo**: Verwenden `v-memo` in Vorlagen, um teure Teilbaumaktualisierungen basierend auf Abhängigkeitsänderungen zu überspringen.
- **markRaw**: Bibliotheksinstanzen von Drittanbietern (z. B. Chart.js, Mapbox) einbinden `markRaw` zu verhindern Vue von dem Versuch, sie reaktiv zu machen.

## React

React wird über den Forge-Laufzeitadapter unterstützt, hauptsächlich für externe Integrationen und bestimmte interne Tools.

### Idiomatische Muster
- **Funktionskomponenten**: Verwenden Sie Funktionskomponenten mit Haken.
- **Forge-Integration**: Neutrale Komponenten mit umwickeln `toReactComponent` aus `@mission-platform/forge/react`.
- **Hooks-Disziplin**: Befolgen Sie strikt die „Hooks-Regeln“, um vorhersehbares Verhalten sicherzustellen.

### Leistungsoptimierungen
- **Auswendiglernen**: Verwenden `React.memo`, `useMemo`, Und `useCallback` um die referenzielle Identität beizubehalten und unnötige erneute Renderings zu vermeiden.
- **Gleichzeitige Funktionen**: Nutzung `useTransition` oder `useDeferredValue` für nicht dringende UI-Updates, damit der Hauptthread reaktionsfähig bleibt.

## Andere Frameworks

Mission Platform bietet über Forge-Adapter unterschiedliche Unterstützungsstufen für andere Frameworks:

- **SolidJS**: Verwendet feinkörnige Reaktivität über Signale. Vermeiden Sie die Zerstörung von Requisiten, um die Reaktivität aufrechtzuerhalten.
- **Svelte 5**: Nutzt Runen (`$state`, `$derived`, `$effect`) für moderne Reaktivität.
- **Webkomponenten (Lit)**: Nützlich für die Erstellung hochportabler Komponenten, die in älteren Umgebungen oder ohne Framework ausgeführt werden müssen.

## Leistungs- und Reaktivitätsmodelle

| Rahmen | Reaktivitätsmodell | Update-Strategie |
| :--- | :--- | :--- |
| **Vue 3** | Proxy-basiert | Virtuelles DOM mit Compiler-Optimierungen. |
| **React** | Unveränderlicher Staat | Virtuelle DOM-Abstimmung. |
| **SolidJS** | Feinkörnige Signale | Direkte DOM-Updates (kein VDOM). |
| **Svelte 5** | Runen / Signale | Direkte DOM-Updates über den Compiler. |
| **Lit** | Reaktive Eigenschaften | Asynchrone Shadow-DOM-Updates. |

## Verwandte Ressourcen
- [Best Practices](best-practices.md)
- [Testleitfaden](testing.md)
- [@mission-platform/forge README](../../../packages/forge/README.md)
