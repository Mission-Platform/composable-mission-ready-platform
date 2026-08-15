# Testing in Mission Platform

This document describes the testing strategy and tooling for the Mission Platform monorepo. It serves as both a **How-to
guide** for common testing tasks and a **Technical reference** for the underlying configuration.

## Testing Stack

Mission Platform uses a modern, unified testing stack based on Vitest:

- **Vitest**: The primary test runner for unit, component, and browser-based testing.
- **@vue/test-utils**: Standard library for testing Vue components.
- **Vitest Browser Mode (Playwright)**: Real-browser execution for interaction and visual testing.
- **Storybook Test Runner**: Integration between Storybook stories and Vitest for automated interaction testing.

## How-to: Run Tests

Tests are executed via Turborepo to leverage caching and workspace-aware execution.

### Run All Tests

To run all unit and component tests across the entire monorepo:

```bash
pnpm test
```

### Run Tests for a Specific Workspace

To run tests for a single package or application:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### Run Affected Tests (CI-style)
For faster local feedback that matches the CI `--affected` behavior:

```bash
pnpm exec turbo run test --affected
```

`--affected` selects test tasks for workspaces changed relative to the repository's base revision. Omit it to run every
workspace test task. Coverage is package-specific; for example, the components package provides:

```bash
pnpm --filter @mission-platform/components test:coverage
```

### Watch Mode
For development, use watch mode to re-run tests on file changes:

```bash
pnpm --filter @mission-platform/components test:watch
```

### Coverage Reports

To generate a coverage report using the `v8` provider:

```bash
pnpm --filter @mission-platform/components test:coverage
```

Reports are output to the `coverage/` directory within each workspace.

## How-to: Write Tests

### Unit and Component Tests

Tests are colocated with the source code and use the `.spec.ts` (or `.spec.tsx`) extension.

```typescript
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ForgeButton from './ForgeButton.vue';

describe('ForgeButton.vue', () => {
  it('renders props.label when passed', () => {
    const label = 'Click Me';
    const wrapper = mount(ForgeButton, {
      props: { label }
    });
    expect(wrapper.text()).toMatch(label);
  });

  it('emits click event when clicked', async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger('click');
    expect(wrapper.emitted()).toHaveProperty('click');
  });
});
```

### Browser Testing

Mission Platform utilizes Vitest's Browser Mode for tests that require a real DOM environment or cross-browser
verification.

1. Author your test file as usual.
2. Ensure the package `vitest.config.ts` enables browser mode (see Reference below).
3. Run with `pnpm test`.

## Technical Reference

### Shared Configuration

Most workspaces use the `defineVitestConfig` utility from `@mission-platform/vite-config`. This provides a standardized
environment:

- **Environment**: `jsdom` by default.
- **Globals**: Enabled (no need to import `describe`, `it`, `expect` unless desired).
- **Plugins**: Includes `@vitejs/plugin-vue` and i18n block ignoring.
- **Coverage**: Preconfigured `v8` provider.

**Example `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  }
});
```

### Directory Structure

- `src/**/*.spec.ts`: Unit tests and component tests.
- `src/**/*.stories.tsx`: Storybook stories (also used as interaction test definitions).
- `apps/storybook/vitest.config.ts`: Main configuration for browser-based interaction tests.

### Scripts Summary

| Script          | Command                   | Purpose                                     |
|:----------------|:--------------------------|:--------------------------------------------|
| `test`          | `pnpm exec turbo run test`                              | Run all workspace test tasks.            |
| `test:watch`    | `pnpm --filter @mission-platform/components test:watch` | Run components tests in watch mode.      |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` | Generate a components coverage report. |
| Rust/WASM       | `pnpm --filter @mission-platform/code-scan-crate test` | Run code-scan WASM tests in Node.        |

## Related Documentation

- [Development Setup](development-setup.md)
- [Best Practices](best-practices.md)
- [Package Development](package-development.md)
