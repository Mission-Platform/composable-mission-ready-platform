---
name: changesets-and-commits
description: Create Changesets and logically grouped Conventional Commits for the Mission Platform monorepo. Use when staging, committing, or releasing changes that touch one or more workspaces under apps/, packages/, or configs/, or whenever the user asks to "commit", "make a changeset", "prepare a release", or "split changes into logical commits".
---

# Changesets & Conventional Commits

This skill packages the Mission Platform release and commit workflow defined in `AGENTS.md` into a repeatable procedure.
Follow it whenever you are about to commit work or prepare a release in this repo.

## When to use

Use this skill whenever any of the following is true:

- The user asks to commit, stage, push, "wrap up", or release changes.
- `git status` shows modified/untracked files under `apps/`, `packages/`, `configs/`, `scripts/`, or the repo root.
- The user references Changesets, CHANGELOG, version bumps, or publishing.

If only documentation outside a workspace changed (e.g. root `README.md`), still use Conventional Commits but skip the
changeset step.

## Core rules (must follow)

1. **Conventional Commits v1.0.0** are mandatory. Format:
   ```
   <type>[(scope)][!]: <description>

   [optional body]

   [optional footer(s)]
   ```
2. **Allowed types**: `feat`, `fix`, `refactor`, `style`, `chore`, `docs`, `test`, `build`, `ci`, `perf`.
3. **Scope** is the workspace directory name under `apps/`, `packages/`, or `configs/` (e.g. `map`, `components`,
   `eslint-config`). Use `repo` for cross-cutting changes that don't belong to a single workspace. Omit scope only if
   truly global and `repo` would be misleading.
4. **Description**: lowercase, imperative mood, no trailing period, ≤ ~72 chars.
5. Use `!` after type/scope **and** a `BREAKING CHANGE:` footer for breaking API changes.
6. **Changeset is required** for any change under `configs/` or `packages/` (published workspaces).
  - **Not required** for changes only under `apps/`, `scripts/`, or repo root tooling. Apps are `"private": true`.
7. **Dependency direction**: never let a commit introduce imports from `apps/` into `packages/` or `configs/`. Flag and
   stop if you see this.
8. **Co-author trailer**: when committing on the user's behalf, append
   `--trailer "Co-authored-by: Junie <junie@jetbrains.com>"` to `git commit`.
9. **Never commit without explicit user instruction.** This skill prepares commits and changesets; it does not
   auto-push.

## Workflow

### Step 1 — Survey the working tree

Run these and read the output carefully:

```bash
git status --porcelain=v1
git diff --stat
git diff            # for unstaged changes
git diff --cached   # for already-staged changes
```

Group the changed paths by **workspace** (top-level dir under `apps/`, `packages/`, `configs/`, or `scripts/`). Each
workspace forms a candidate commit group.

### Step 2 — Plan logical commits

Split changes into the smallest number of commits where **each commit is internally coherent**:

- One commit per workspace per concern. Don't mix `feat` and `fix` for the same workspace in one commit.
- A refactor that spans multiple workspaces to enable a feature is acceptable as a single `refactor(repo): …` commit
  **only** when the change is mechanical and uniform; otherwise split per workspace.
- Test-only updates colocated with code changes belong **in the same commit** as the code they cover (don't separate
  `test(x)` from `feat(x)` unless the tests are independent).
- Generated/build artefacts (`dist/`, `*.lock` other than `pnpm-lock.yaml`) should not be committed. `pnpm-lock.yaml`
  changes go with the commit that caused them.

Present the plan to the user as a short list before executing, e.g.:

```
1. feat(components): add BaseTooltip component
   - packages/components/src/components/base-tooltip/**
   - apps/storybook/src/stories/base-tooltip.stories.ts
2. fix(map): make selectFeature parameter optional
   - packages/map/src/composables/use-select-feature.ts
3. chore(repo): bump pnpm-lock for new dependency
   - pnpm-lock.yaml
```

Wait for confirmation (or proceed if the user already said "go ahead").

### Step 3 — Determine the bump for each published workspace

For every commit that touches `configs/<x>` or `packages/<x>`, pick the smallest meaningful SemVer bump (mirror the
commit type):

| Commit type/marker                                                   | Changeset bump |
|----------------------------------------------------------------------|----------------|
| `fix`, `refactor`, `perf`, `style`, `test`, `docs`, `build`, `chore` | `patch`        |
| `feat`                                                               | `minor`        |
| `!` / `BREAKING CHANGE:` footer                                      | `major`        |

A single changeset may list multiple packages when one change genuinely affects them all. Otherwise prefer one changeset
per commit per affected workspace.

### Step 4 — Write the changeset (s)

Prefer the non-interactive path: create the markdown file directly under `.changeset/` rather than running
`pnpm changeset` (which is interactive).

File name: a short, kebab-case slug, e.g. `.changeset/tooltip-component.md`. Use a fresh slug; do not overwrite existing
files.

Content format:

```md
---
'@mission-platform/<package-a>': minor
'@mission-platform/<package-b>': patch
---

<description mirroring the Conventional Commit subject, without the `type(scope):` prefix>
```

Rules:

- Use the **scoped package name** (`@mission-platform/...`), not the directory name.
- The summary must read naturally in the generated CHANGELOG. Don't include the `type(scope):` prefix; do keep
  imperative mood.
- For a breaking change, add a second paragraph starting with `BREAKING CHANGE:` describing the migration.
- Include the changeset file **in the same commit** as the code change it documents.

Verify after writing:

```bash
pnpm changeset status
```

Confirm the listed bumps match your plan.

### Step 5 — Stage and commit each group

For each planned commit, in order:

```bash
git add <paths-for-this-group> <matching .changeset/*.md if applicable>
git commit \
  -m "<type>(<scope>): <description>" \
  [-m "<body>"] \
  [-m "BREAKING CHANGE: <details>"] \
  --trailer "Co-authored-by: Junie <junie@jetbrains.com>"
```

Notes:

- Use multiple `-m` flags rather than embedded newlines.
- Do not run `git commit -a`. Stage explicitly so unrelated changes don't leak into a commit.
- After each commit, run `git status` to confirm a clean handover to the next group.

### Step 6 — Final verification

After all commits:

```bash
git log --oneline -n <N>
pnpm changeset status
```

Report to the user:

- The list of commits created (hash + subject).
- The changesets added and the bump each will produce.
- Anything intentionally left uncommitted, and why.

Do **not** run `pnpm changeset version`, `pnpm changeset publish`, or `git push` unless the user explicitly asks.

## Quick reference — examples

Good commit subjects (from `AGENTS.md`):

```
feat(components): add BaseTooltip component
fix(map): make selectFeature parameter optional
refactor(components): remove redundant Window interface in use-hunspell-monaco
style(components): reformat Vue SFCs with htmlWhitespaceSensitivity ignore
chore(eslint-config): move shared eslint config into the configs/ workspace
chore: add dist/ to .gitignore
feat(api)!: drop support for Vue 2
```

Minimal changeset for a non-breaking fix in the map package:

```md
---
'@mission-platform/map': patch
---

make selectFeature parameter optional
```

Multi-package minor feature:

```md
---
'@mission-platform/components': minor
'@mission-platform/icons': patch
---

add BaseTooltip component and supporting tooltip icon
```

Breaking change:

```md
---
'@mission-platform/api': major
---

drop support for Vue 2

BREAKING CHANGE: Vue 2 is no longer supported; upgrade to Vue 3.5+.
```

## Failure modes to watch for

- **Missing changeset** for a `configs/` or `packages/` change — CI's `Conventional Commits` workflow will fail. Always
  add one.
- **Wrong scope** (e.g. `feat(my-care-notes-app)` instead of `feat(my-care-notes)`) — scope must match the directory
  name exactly.
- **Mixed concerns** in one commit — split them.
- **Apps-only change with a changeset** — remove it; apps are private.
- **Capitalised or period-terminated description** — rewrite in lowercase imperative without a trailing period.
- **Forgotten co-author trailer** — amend with
  `git commit --amend --trailer "Co-authored-by: Junie <junie@jetbrains.com>"` before any push.
