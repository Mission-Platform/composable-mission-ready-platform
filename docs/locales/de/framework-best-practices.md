# Best Practices für das Framework

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/framework-best-practices.md: [docs/framework-best-practices.md](../../framework-best-practices.md)
> Sprache: Deutsch (de)

Dieses Dokument bietet Anleitungen zu idiomatischen Mustern, Reaktivitätsmodellen und Leistungsoptimierungen für die von der Mission Platform unterstützten Frameworks. Es dient als **Erläuterung** unserer Multi-Framework-Strategie und als Referenz für die Framework-spezifische Entwicklung.

## Multi-Framework-Strategie

Die Kernphilosophie der Mission Platform besteht darin, einmal zu erstellen und überall zu rendern. Dies wird durch **@mission-platform/forge-jsx** erreicht, das primäre Framework der Plattform: eine Framework-neutrale JSX-Laufzeit, in der alle gemeinsam genutzten Komponenten (alles außer den Apps) erstellt und von der aus sie nahtlos in Vue 3, React und anderen unterstützten Umgebungen gerendert werden.

### Der Forge-Dialekt
Erstellen Sie beim Erstellen gemeinsam genutzter Pakete Komponenten mithilfe der neutralen Grundelemente von Forge:
- **JSX Factory**: Verwenden Sie `h` und `Fragment` von `@mission-platform/forge-jsx`.
- **Neutrale Hooks**: Verwenden Sie `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback` und `useId`.
- **Grundelemente**: Verwenden Sie `Slot`, `Teleport`, `Transition` und `Dynamic` für komplexe UI-Strukturen.

## Vue 3

Vue 3 ist das Framework, mit dem die Anwendungen in `apps/` erstellt werden, und das primäre native Renderziel für Forge-Komponenten. Gemeinsam genutzte Komponenten selbst werden in Forge JSX erstellt und nicht direkt in Vue.

### Idiomatische Muster
- **Composition API**: Verwenden Sie `<script setup lang="ts">` für alle neuen Komponenten.
- **Forge-Integration**: Neutrale Komponenten mit `toVueComponent` aus `@mission-platform/forge-adapters/vue` umschließen.
- **Composables**: Stateful-Logik in `useXxx`-Funktionen extrahieren, um die Wiederverwendbarkeit zu fördern.

### Leistungsoptimierungen
- **Geringe Reaktivität**: Verwenden Sie `shallowRef` oder `shallowReactive` für große, komplexe Datensätze, um Proxy-Overhead zu vermeiden.
- **v-memo**: Verwenden Sie `v-memo` in Vorlagen, um teure Teilbaumaktualisierungen basierend auf Abhängigkeitsänderungen zu überspringen.
- **markRaw**: Wickeln Sie Bibliotheksinstanzen von Drittanbietern (z. B. Chart.js, Mapbox) in `markRaw` ein, um zu verhindern, dass Vue versucht, sie reaktiv zu machen.

## React

React wird über den Forge-Laufzeitadapter unterstützt, hauptsächlich für externe Integrationen und bestimmte interne Tools.

### Idiomatische Muster
- **Funktionskomponenten**: Verwenden Sie Funktionskomponenten mit Haken.
- **Forge-Integration**: Neutrale Komponenten mit `toReactComponent` aus `@mission-platform/forge-adapters/react` umschließen.
- **Hooks-Disziplin**: Befolgen Sie strikt die „Hooks-Regeln“, um vorhersehbares Verhalten sicherzustellen.

### Leistungsoptimierungen
- **Memoisierung**: Verwenden Sie `React.memo`, `useMemo` und `useCallback`, um die referenzielle Identität beizubehalten und unnötige erneute Renderings zu vermeiden.
- **Gleichzeitige Funktionen**: Nutzen Sie `useTransition` oder `useDeferredValue` für nicht dringende UI-Updates, um die Reaktionsfähigkeit des Hauptthreads aufrechtzuerhalten.

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
- [@mission-platform/forge-jsx README](../../../packages/core/forge-jsx/README.md)
