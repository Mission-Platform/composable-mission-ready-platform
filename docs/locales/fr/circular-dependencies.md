# Circular Dependency Management

This document explains the impact of circular dependencies within the Mission Platform monorepo and provides a **How-to
guide** for detecting, resolving, and preventing them. It serves as both an **Explanation** of monorepo health and a
technical recipe for refactoring.

## What are Circular Dependencies?

A circular dependency occurs when two or more packages depend on each other, either directly or indirectly. For example:

- Package A imports from Package B.
- Package B imports from Package A.

In a monorepo, these cycles are particularly harmful because they can cause:

- **Build Failures**: Dependency graph resolution (e.g., by Turborepo or pnpm) can deadlock or fail.
- **Runtime Errors**: One module may be partially initialized when the other attempts to use its exports.
- **Increased Coupling**: Packages become impossible to use or test in isolation.

## Detection

Mission Platform uses several automated tools to catch circular dependencies before they reach production.

### ESLint `no-restricted-paths`

Our shared ESLint configuration enforces the one-way dependency flow. If you attempt to import from a package that
should be "above" yours in the hierarchy, the linter will throw an error.

Run the linter to check for violations:

```bash
pnpm lint
```

### Manual Audit with Madge

For complex cycles that span multiple files, you can use `madge` (if installed) or similar visualizers to map the
dependency graph.

## How-to: Resolve Circular Dependencies

When a circular dependency is detected, use one of the following strategies to resolve it.

### Strategy 1: Extract Shared Code (Recommended)

If Package A and Package B both need a common piece of logic, move that logic into a new, lower-level package (e.g.,
`packages/utils-shared`).

**Before**:

- Package A ↔ Package B

**After**:

- Package A → Package C
- Package B → Package C

### Strategy 2: Dependency Inversion

Instead of Package B importing directly from Package A, have Package B accept the required functionality as a prop, a
configuration object, or via an event bus.

**Example**:
Instead of `AuthService` importing `UserService` to update a profile, `AuthService` can emit an `AUTH_SUCCESS` event
that `UserService` listens for.

### Strategy 3: Consolidation

If two packages are so tightly coupled that they constantly require each other's internals, they might actually be a
single logical unit. Consider merging them into one package.

## Prevention Best Practices

1. **Follow the One-Way Flow**: Strictly adhere to the `Apps → Packages → Configs` dependency direction.
2. **Author Framework-Neutral Logic**: Use `@mission-platform/forge-jsx` for core logic to avoid framework-specific cycles.
3. **Use Workspace Protocols**: Always use `workspace:*` for internal dependencies to ensure pnpm can correctly resolve
   the graph.
4. **Regularly Audit Imports**: Pay attention to "auto-import" suggestions in your IDE, as they can sometimes introduce
   unintended cross-package dependencies.

## Related Documentation

- [Best Practices](best-practices.md)
- [Workspace Structure](workspace-structure.md)
- [Troubleshooting Guide](troubleshooting.md)
