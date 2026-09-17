---
name: monorepo-coding
description: "Enforce asset reuse, eliminate invented code, and mandate discovery-first development across the Mission Platform monorepo. Use before authoring UI components, styling, utility functions, or translations to discover and reuse existing packages, design tokens, and components."
---

# Monorepo Coding Capability: Asset Discovery & Anti-Invention

## Overview & The Anti-Invention Mandate

The Mission Platform follows a composable, package-driven architecture. A primary source of technical debt in large monorepos is **invented code** — creating new components, hardcoding custom colors or spacing, writing redundant utility functions, or creating ad-hoc translations when canonical implementations already exist in `packages/`.

Before writing any new code, assistants and developers **must** search the monorepo's existing assets. The rule is strict: **Inspect and reuse before authoring.**

---

## Mandatory 4-Step Asset Discovery Protocol

Whenever a task requires user interface, styling, helper logic, or localized text, execute the following protocol in order:

```
┌─────────────────────────┐
│ 1. Search Components    │ ──> list_components, get_component_usage
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 2. Search Design Tokens │ ──> packages/tokens, --mp-* CSS custom properties
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 3. Search Utilities     │ ──> lsp_find_symbol, lsp_list_symbols, packages/* barrels
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 4. Search Locales       │ ──> @mission-platform/i18n, *.yaml message catalogs
└─────────────────────────┘
```

### Step 1: Discover Existing Components

- **Action**: Check if a UI element already exists before writing JSX, Vue templates, or HTML.
- **MCP Tools**: Call `list_components` to view available components, followed by `get_component_usage` for the specific component to inspect its props interface, slots, and framework import syntax.
- **Filesystem**: Inspect `packages/components/src/components/` and the main barrel `packages/components/src/index.ts`.
- **Mandate**: Never author a custom `<button>`, modal dialog, dropdown, tooltip, badge, card, or tab set from scratch. Re-export or compose with `@mission-platform/components`.

### Step 2: Discover Design Tokens

- **Action**: Look up existing design tokens before adding CSS rules or inline styles.
- **Tokens Package**: `@mission-platform/tokens`.
- **CSS Variables**: Use the `--mp-*` CSS custom properties:
  - Colors: `--mp-color-brand-*`, `--mp-color-neutral-*`, `--mp-color-surface-*`, `--mp-color-text-*`, `--mp-color-border-*`.
  - Spacing: `--mp-space-1` through `--mp-space-16`.
  - Typography: `--mp-font-size-*`, `--mp-font-weight-*`, `--mp-line-height-*`.
  - Radii: `--mp-radius-sm`, `--mp-radius-md`, `--mp-radius-lg`, `--mp-radius-full`.
  - Shadows & Focus: `--mp-shadow-*`, `--mp-shadow-focus-*`.
- **Mandate**: Never write arbitrary hex codes (`#1a73e8`), `rgb()`, or arbitrary pixel values for spacing (`margin: 14px`). Always reference `--mp-*` custom properties.

### Step 3: Discover Utilities & Shared Barrels

- **Action**: Search existing packages and shared libraries before writing data transformations, formatting routines, date helpers, or validation checks.
- **MCP Tools**: Use `lsp_find_symbol`, `lsp_list_symbols`, and `lsp_go_to_definition` across `packages/`.
- **Key Packages**:
  - `@mission-platform/tokens`: Token definitions and theme utilities.
  - `@mission-platform/i18n`: Internationalization helpers, formatting, and message loaders.
  - `@mission-platform/forge-jsx`: Neutral JSX runtime and compiler helpers.
  - `@mission-platform/mcp-shared`: Shared monorepo path, scanning, and security helpers.
- **Mandate**: Never implement custom debounce, clamp, deep-clone, date formatting, or string normalization routines when existing packages or standard platform APIs provide them.

### Step 4: Discover & Reuse Translations

- **Action**: Check existing translation catalogs and internationalization keys before writing user-facing strings.
- **Catalogs**: Inspect `packages/*/src/locales/*.yaml` and `apps/*/locales/`.
- **MCP Tools**: Call `surveyLocales` and `localeCoverage` to inspect available translation namespaces and keys.
- **Mandate**: Never embed hardcoded natural language strings into UI templates. Reference translation keys through `@mission-platform/i18n` (e.g. `t('common.confirm')`).

---

## Prohibited Anti-Patterns (Zero Redundant Primitives)

| Prohibited Anti-Pattern                            | Correct Monorepo Approach                                                         |
| :------------------------------------------------- | :-------------------------------------------------------------------------------- |
| Writing a custom `<button class="my-btn">`         | Import `ForgeButton` / `BaseButton` from `@mission-platform/components`           |
| Using `color: #3b82f6; padding: 12px;`             | Use `color: var(--mp-color-brand-primary); padding: var(--mp-space-3);`           |
| Writing a custom `useDebounce()` or `formatDate()` | Search `packages/` barrels or use standard Intl / existing composables            |
| Adding hardcoded `<p>Welcome back!</p>`            | Add `welcome_back` to `locales/en/common.yaml` and use `t('common.welcome_back')` |
| Embedding reusable UI logic inside `apps/`         | Place reusable UI, composables, or tokens in `packages/`                          |
| Importing from `apps/` within a `packages/` module | Refactor shared types or logic into a common package under `packages/`            |

---

## Strict Dependency Direction Rules

The repository architecture strictly enforces **one-way dependency flow**:

```
apps/  ─── depends on ───>  packages/
packages/  ─X─ NEVER IMPORTS FROM ─X─  apps/
```

1. **Packages Never Import Apps**: Any file located under `packages/` must **never** import from `apps/`.
2. **Domain Isolation**: Packages depend only on lower-level shared contracts, compiler packages, or peer packages.
3. **App Composition**: Applications in `apps/` act strictly as composition workbenches that assemble building blocks from `packages/`.

---

## Secure Coding & Compliance Mandate (OWASP 2025 & ISO 27001)

Code authored in the monorepo must strictly adhere to **ISO/IEC 27001:2022 Control A.8.28 (Secure Coding)** and eliminate vulnerabilities identified in the **OWASP Top 10 (2025)** and **CWE Top 25**:

1. **Injection Prevention (OWASP A03 / CWE-79, CWE-78, CWE-89)**:
   - DOM XSS: Never assign un-sanitized dynamic markup to `innerHTML`, `v-html`, or `dangerouslySetInnerHTML`. Always wrap with `DOMPurify.sanitize(...)`.
   - Command Injection: Never interpolate variables into shell command strings (`exec(\`...\`)`). Use argument arrays with `execFile()` or `spawn()`.
   - SQL Injection: Always use parameterized queries rather than string concatenation.
2. **Access Control & Path Safety (OWASP A01 / CWE-22, CWE-601)**:
   - Path Traversal: Always resolve and validate paths using `resolveRepoPath(...)` or explicit allowlists before reading or writing files.
   - Safe Navigation: Reject `javascript:` and `data:` schemes in links and navigation targets.
3. **Cryptographic Hygiene (OWASP A02 / CWE-327, CWE-330)**:
   - Never use broken hash algorithms (`MD5`, `SHA1`) for security purposes. Use SHA-256 (`crypto.createHash('sha256')`) or modern key derivation (Argon2, bcrypt).
   - Never use `Math.random()` to generate tokens, passwords, nonces, or secrets. Always use `crypto.getRandomValues()` or `node:crypto randomBytes()`.
4. **Data Leakage & Logging Prevention (ISO A.8.12 / CWE-532, CWE-798)**:
   - Never hardcode secrets, API keys, or private keys.
   - Never print credentials, tokens, or passwords to `console.log` or logging sinks.
5. **Supply Chain Integrity (OWASP A08 / ISO A.8.20, A.8.25)**:
   - Avoid adding unvetted lifecycle install scripts (`postinstall`, `preinstall`).
   - Reject unencrypted `http://` or `git://` dependency sources.
6. **Automated Evidence Collection**:
   - Run `security_collect_compliance_evidence` to verify ISO 27001 control compliance and generate audit scorecards prior to major changes.

---

## Discovery-First Checklist Before Proposing Code

Before submitting any implementation plan or code changes, verify:

- [ ] Did I run `list_components` to see if a matching component already exists?
- [ ] Are all colors, margins, paddings, and font sizes bound to `--mp-*` CSS custom properties?
- [ ] Did I search `packages/` with `lsp_find_symbol` for existing helpers instead of writing duplicate utilities?
- [ ] Are all UI text elements backed by `@mission-platform/i18n` locale keys?
- [ ] Does my code respect strict one-way dependency direction (`packages/` does not import `apps/`)?
- [ ] Does my code pass OWASP 2025 and ISO 27001 secure coding checks (`security_analyze_code` & `security_scan_secrets`)?
