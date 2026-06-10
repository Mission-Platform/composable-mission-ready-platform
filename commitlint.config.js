/**
 * Commitlint configuration for the Mission Platform monorepo.
 *
 * Enforces Conventional Commits v1.0.0 locally (via the Husky `commit-msg`
 * hook) to mirror the server-side `Conventional Commits` GitHub workflow
 * (`.github/workflows/conventional-commits.yml`) and the rules documented in
 * `AGENTS.md` — the allowed types, lowercase imperative description, and the
 * 72-character subject limit are kept in sync between both checks.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Allowed types, matching AGENTS.md and the CI regex.
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refactor',
        'style',
        'chore',
        'docs',
        'test',
        'build',
        'ci',
        'perf',
        'revert',
      ],
    ],
    // Scope is optional but, when present, must be lowercase
    // (the workspace directory name, or `repo` for cross-cutting changes).
    'scope-case': [2, 'always', 'lower-case'],
    // Description must be present and without a trailing period.
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    // Disallow a capitalised first letter (mirrors the CI `[^A-Z]` check)
    // while still permitting mixed-case identifiers like `add BaseTooltip`.
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    // Whole subject (header) must be at most 72 characters, as enforced in CI.
    'header-max-length': [2, 'always', 72],
  },
}
