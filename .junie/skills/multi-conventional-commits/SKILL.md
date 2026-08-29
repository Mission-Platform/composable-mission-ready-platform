# Multi-Commit Conventional Commit Workflow

Use this skill when the user explicitly asks to commit the current project using multiple Conventional Commits, or asks to make that workflow reusable.

## Preconditions

- Never commit without explicit user instruction.
- Inspect the working tree before staging anything:

  ```bash
  git status --porcelain=v1
  git diff --stat
  git diff
  git diff --cached
  ```

- Treat pre-existing staged and unstaged changes as user-owned. Do not discard, reset, or broadly clean them.
- Never stage secrets, generated build output such as `dist/`, or unrelated files.

## Grouping changes

Create the smallest set of internally coherent commits:

1. Group by workspace and concern, using the workspace directory as the scope.
2. Keep implementation and the tests that cover it together.
3. Keep generated API documentation with the implementation it documents; use a separate `docs(repo)` commit for documentation-only regeneration.
4. Keep dependency manifests, lockfiles, patches, CI, and runtime tooling in focused maintenance commits.
5. Keep app-only changes separate from published package changes.

Use a `repo` scope for changes that span workspaces or are repository-wide. Do not mix unrelated fixes merely because they were changed at the same time.

## Changesets

For every changed published package or configuration workspace, add a fresh `.changeset/<kebab-case-slug>.md` in the same commit as the change it documents. Use the package name from `package.json`, not the directory name.

Choose the smallest bump:

- `feat` → `minor`
- `fix`, `refactor`, `perf`, `style`, `test`, `docs`, `build`, or `chore` → `patch`
- Breaking changes → `major`, with both `!` in the subject and a `BREAKING CHANGE:` footer

Do not create changesets for private apps or repository-only tooling unless project policy requires them. Verify with:

```bash
pnpm changeset status
```

## Commit procedure

Present a short commit plan before execution when the user has not already specified the grouping. Then, for each group in dependency order:

```bash
git add <explicit-paths> <matching-changeset>
git commit \
  -m "<type>(<scope>): <imperative description>" \
  --trailer "Co-authored-by: Junie <junie@jetbrains.com>"
git status --porcelain=v1
```

Commit subjects must use an allowed Conventional Commit type, lowercase imperative wording, no trailing period, and a concise description. Use additional `-m` flags for a body or footer rather than embedding an escaped multiline message.

## Verification and boundaries

After all commits, run:

```bash
git log --oneline -n <number-of-commits>
git status --porcelain=v1
pnpm changeset status
```

Report every commit hash and subject, every changeset and bump, and any intentionally uncommitted files. Do not run `git push`, `pnpm changeset version`, or `pnpm changeset publish` unless explicitly requested. Do not use `--no-verify`, force operations, or amend a commit to hide a hook failure.