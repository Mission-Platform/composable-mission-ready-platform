# Veiligheid en validatie van opslagplaatsen

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/agent-guidance/repository-safety-and-validation.md: [docs/agent-guidance/repository-safety-and-validation.md](../../../agent-guidance/repository-safety-and-validation.md)
> Taal: Nederlands (nl)

Dit onderwerp is verplicht voor taken op het gebied van implementatie, refactoring, testen, genereren, opslagplaatsinspectie, werkboom, LSP, beveiliging en bestandsbeheer. Het behoudt de gedetailleerde operationele beperkingen die zijn samengevat in de root `AGENTS.md`.

## Afhankelijkheidsrichting en activadetectie

- Code in `packages/` mag nooit worden geïmporteerd uit `apps/`. Applicaties verbruiken herbruikbare pakketleden; domeinpakketten kunnen afhankelijk zijn van `core`, `tooling` en compilercontracten op een lager niveau zonder applicaties te importeren.
- Voordat u code schrijft, inspecteert u bestaande assets met de MCP-tools uit de repository (`list_components`, `get_component_usage`, `lsp_find_symbol` en `lsp_list_symbols`) en inspectie van het bestandssysteem.
- Hergebruik `@mission-platform/components` in plaats van dubbele UI-primitieven te maken, verwijs naar `--mp-*`-tokens in plaats van hardgecodeerde visuele waarden, zoek in `packages/` naar gedeelde hulpprogramma's en gebruik YAML-catalogi met `@mission-platform/i18n` voor gebruikersgerichte tekenreeksen.
- Nieuwe gedeelde UI-componenten, composables, hulpprogramma's en ontwerptokens horen thuis in `packages/`; gedeelde lint-, format- en build-tools horen thuis in `packages/tooling/configs/`.
- Wanneer u een pakketcomponent wijzigt, voegt u de bijbehorende `.stories.tsx`-story toe of werkt u deze bij. De `apps/storybook`-workbench ontdekt pakketverhalen over Vue, React, Solid, Svelte en webcomponenten.

## Veilige codering en naleving

Alle code en configuratie moeten ISO/IEC 27001:2022-controle A.8.28 volgen en bescherming bieden tegen de OWASP Top 10 (2025) en CWE Top 25.

- Geef nooit inloggegevens, privésleutels, cloudtokens of andere geheimen door.
- Maak HTML schoon met `DOMPurify.sanitize`, parametreer queries en gebruik vectorargumenten zoals `execFile` in plaats van geïnterpoleerde shell-strings.
- Gebruik moderne cryptografie zoals SHA-256 en `crypto.getRandomValues`; Gebruik `Math.random()` nooit voor beveiligingsgevoelige waarden.
- Vermijd niet-doorgelichte `postinstall`-levenscyclusscripts en pin-afhankelijkheden via catalogusreferenties.
- Behoud de minste privileges, repository-root- en padgrenzen, shell-vrije uitvoering, expliciete schrijfgoedkeuring en grenzen van beveiligingstools.
- Voordat u een PR voorstelt, voert u de relevante ontwikkelaar-MCP-beveiligingscontroles uit: `security_scan_secrets`, `security_analyze_code`, `security_audit_dependencies`, `security_audit_supply_chain`, `security_collect_compliance_evidence` en `security_audit_compliance`, indien van toepassing.

## Werkbomen en bouw afhankelijkheden

- Parallelle werkstromen moeten geïsoleerde Git-werkbomen gebruiken die zijn ingericht met `node --experimental-strip-types scripts/worktree-manager.ts create <branch>`.
- Bouw in een nieuwe werkstructuur upstream-werkruimte-afhankelijkheden vóór pakkettests of typecontroles, omdat interne `dist/`-artefacten mogelijk ontbreken:

  ```bash
  pnpm exec turbo run build --filter <package-name>^...
  ```

- Werkbomen delen `.turbo/cache`; wis of omzeil die cache niet.

## Draagbare LSP-configuratie

- LSP-definities in `agent-lsp.json` moeten draagbare relatieve aanroepen gebruiken, zoals `["pnpm", "exec", "<server>", "--stdio"]` of `["pnpm", "--dir", "relative/path", ...]`.
- Hardcodeer nooit absolute systeempaden. De MCP LSP-server voert taalservers uit vanuit de gedetecteerde repository of werkboomroot.
- LSP-query- en uitvoeringstools vereisen een actieve sessie. Controleer `lsp_status` en gebruik `lsp_start` indien nodig.
- De native server TypeScript 7 gebruikt `tsc --lsp --stdio` (`typescript-go` 7.0.2). Tijdens het indexeren kunnen symbool- en hover-query's voor de hele werkruimte optreden; gebruik protocoltime-outs van 15.000–30.000 ms en vul deze aan met pakketgerichte typecontroles en Vitest.
- Als er een time-out optreedt bij het opstarten of bij het ontdekken, gebruik dan pakketgerichte typecontroles en Vitest als diagnostische fallback in plaats van de taak te blokkeren.

## Flint- en scannervalidatie

- Flint LSP-diagnostiek is alleen feedback op bronniveau; ze bewijzen niet dat een gekoppelde grafiek met meerdere modules een geldige Wasm uitzendt of dat de runtime-ABI ervan correct wordt uitgevoerd.
- Voor wijzigingen in de scannergrafiek voert u de gerichte grafische suite, pakket `type-check` en pakket Vitest suite uit. Registreer storingen bij artefactemissie afzonderlijk van de brondiagnostiek.
- Een armatuur of gereduceerd decoderpad brengt geen volledige ZXing-pariteit tot stand. Markeer niet-ondersteunde modi, indelingssubsets, metagegevens, nieuwe pogingen en migraties van overheidscontracten expliciet in het plan en de pull-aanvraag.
- Als de statische koppeling mislukt, leg dan de tellingen van de grafiekmodule en de randen, de emitterdiagnostiek en de kleinste geïsoleerde reproducer vast voordat u de algoritmecode wijzigt of tests verzwakt.

## Codestijl en verificatie

- Nieuwe bronbestanden gebruiken `.ts` of `.vue` met `<script setup lang="ts">`; openbare API's en geëxporteerde functies hebben expliciete typen nodig.
- Gebruik `undefined` voor ontbrekende of gewiste waarden, tenzij een extern protocol `null` vereist.
- Forge JSX-evenementrekwisieten gebruiken standaard camelCase-namen zoals `onKeyDown`, `onPointerDown` en `onMouseDown`.
- Groepeer import in deze volgorde zonder lege regels binnen een groep: ingebouwde Node, externe afhankelijkheden, interne `@mission-platform/*`-pakketten en relatieve bestanden. Scheid groepen met één lege regel.
- Voer `pnpm --filter <pkg> run lint` en `pnpm --filter <pkg> run lint:style` uit; gebruik het pakket ESLint fix alleen voor toepasselijke stijlfouten. Markdown en verhalen gebruiken de opmaakworkflow voor de repository.
- Wijzigingen in de compiler, transpiler, AST en codegeneratie vereisen end-to-end integratiedekking. Controleer niet-botsende uitvoer op identieke basisnamen, ondubbelzinnige herexport van invoer en bewaarde uitgezonden inhoud.
- `TargetIntentions.lowered` is verplicht in `@mission-platform/forge-plugin-api`; doelplug-ins vereisen verlaagde plannen. Fixtures, mocks en CMS-integratieplug-ins moeten `{ framework, appliedOptimizations: [] }` leveren of `lower -> optimize -> generate` uitvoeren.
- Bij parallelle belasting moeten multi-framework-, documentatie-extractie- en grote AST-tests expliciete `60_000`-`120_000` ms-time-outs gebruiken.
- Gebruik voor transversaal planwerk een onafhankelijke beoordeling gericht op end-to-end gedrag, negatieve tests en pakketgerichte lintpoorten.

## Interactiemodi

Gebruik de eerste toepasselijke modus en bewaar deze voor de sessie, tenzij de persistentieregel een overstap toestaat:

1. `[CHAT]` voor begroetingen, praatjes, feitelijke vragen of eenvoudige wiskunde.
2. `[ADVANCED_CHAT]` voor alleen-lezen uitleg, analyse, het vinden van informatie of voorstellen.
3. `[RUN_VERIFY]` voor korte veilige opdrachten, app-runs of tests zonder bewerkingen.
4. `[FAST_CODE]` voor een triviale wijziging van één bestand waarvoor geen extra contextverzameling nodig is.
5. `[SETUP]` voor builds, installaties, infrastructuur, omgevingsoplossingen of systeemcontroles.
6. `[CODE]` voor niet-triviale projectwijzigingen die onderzoek of meerdere stappen vereisen.
7. `[NICHE]` alleen voor gespecialiseerd forensisch onderzoek, reverse engineering, gegevensherstel of beveiligingsonderzoek dat niet in een andere modus past.

`[CHAT]` en `[CODE]` wisselen niet van modus. `[ADVANCED_CHAT]` schakelt pas over naar `[CODE]` na een expliciet implementatieverzoek; `[FAST_CODE]` en `[RUN_VERIFY]` schakelen over naar `[CODE]` als ze niet binnen drie stappen kunnen eindigen; `[SETUP]` en `[NICHE]` kunnen overschakelen naar `[CODE]` wanneer implementatie noodzakelijk wordt.

## Atomaire generatie en bestandsbeheer

- Veeg of verwijder nooit een generatiedoel vóór een succesvolle generatie. Werk artefacten uit in een pogingsdirectory op hetzelfde niveau, zoals `.forge-attempt/`, voer pre-commit-diagnostiek uit en wissel alleen atomair nadat de controles zijn geslaagd.
- Bewaar dot-bestanden in de opslagplaats, zoals `.gitkeep` en `.gitignore`, en behoud in-flight staging-directory's bij het synchroniseren of opschonen van builddoelen.
- Houd mutaties expliciet en begrensd. Gebruik geen brede opruimopdrachten en verwijder geen bestanden die niet voor de huidige taak zijn gemaakt.

## Ontwikkelaar MCP LSP Workflowcontract

Geef de voorkeur aan de begrensde `lsp_*` code-intelligentietools van de ontwikkelaar MCP boven handmatig zoeken naar tekst voor codetaken. Gebruik `lsp_capabilities` om het huidige contract en de beschikbaarheid te bevestigen; gebruik vóór het bewerken de alleen-lezen `lsp_review_structure` of `lsp_debug_context`, gebruik `lsp_preview_edit` voordat u een LSP-bewerking toepast en gebruik na een wijziging `lsp_get_diagnostics`, vervolgens `lsp_run_build` en `lsp_run_tests`, indien van toepassing.

Gebruik de speciaal gebouwde mapping: `lsp_list_symbols` voor structuur, `lsp_find_symbol` voor symbolen, `lsp_find_references` voor gebruik, `lsp_inspect_symbol` voor begrip, `lsp_find_callers` voor oproeplocaties, `lsp_replace_symbol_body` voor functievervanging en `lsp_safe_delete_symbol` voor ongebruikte symbolen. Gebruik de gedocumenteerde `/lsp-*`-workflows voor architectuur, impact, refactoring, veilige bewerkingen, testcorrelatie en volledige verificatie.

Gerelateerd beleid: [Kwaliteitsrubriek](quality-rubric.md), [Sessie-zelfbeoordeling](session-self-review.md) en de hoofdmap [AGENTS.md](../../../../AGENTS.md).
