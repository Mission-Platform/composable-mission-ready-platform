# Testing in Mission Platform

This guide provides comprehensive information on testing strategies and tools used within the Mission Platform.

## Overview of Testing

Mission Platform employs a robust testing strategy to ensure the reliability and quality of its components and applications. The testing framework includes:

- **Vitest**: For unit testing across all packages and applications.
- **Playwright**: For browser-level testing to ensure real-world functionality.
- **Storybook**: For visual and interaction testing of components.

## Running Tests

### Running All Tests

To run tests across the entire workspace:

```bash
turbo run test
```

### Running Tests for a Specific Package

To run tests for a specific package:

```bash
turbo run test --filter=@mission-platform/<package-name>
```

### Running Tests for Affected Packages

To run tests only for packages affected by recent changes:

```bash
turbo run test --affected
```

## Writing Unit Tests

Unit tests are written using Vitest. Below is an example of a unit test:

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from './my-function'

describe('myFunction', () => {
  it('should return the correct value', () => {
    expect(myFunction(2)).toBe(4)
  })
})
```

### Best Practices for Unit Tests

1. **Test Critical Functionality**: Focus on testing the core logic of your functions and components.
2. **Isolate Tests**: Ensure each test is independent and does not rely on the state of other tests.
3. **Use Descriptive Names**: Name your test functions and describe blocks clearly to indicate what is being tested.
4. **Test Edge Cases**: Include tests for edge cases such as empty inputs, boundary conditions, and error scenarios.

## Writing Browser Tests with Playwright

Browser-level tests are written using Playwright. Below is an example:

```typescript
import { test, expect } from '@playwright/test'

test('should navigate to the home page', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Mission Platform/)
})
```

### Best Practices for Browser Tests

1. **Test User Flows**: Focus on testing the user flows and interactions that occur in a browser environment.
2. **Use Page Objects**: Organize your tests using page objects to improve maintainability and readability.
3. **Test Across Browsers**: Ensure your tests run across different browsers to catch browser-specific issues.
4. **Include Visual Regression Tests**: Use Playwright's screenshot capabilities to detect unintended visual changes.

## Component Testing with Storybook

Storybook is the primary environment for developing and testing components. It allows you to visualize components in isolation and test their interactions.

### Starting Storybook

To start the Storybook development server:

```bash
turbo run storybook --filter=@mission-platform/storybook
```

### Writing Stories

Stories are written for each component to document its usage and test its interactions. Below is an example of a Storybook story:

```typescript
import { h } from 'vue'
import Button from './Button.vue'

export default {
  title: 'Components/Button',
  component: Button,
}

const Template = (args) => ({
  components: { Button },
  setup() {
    return { args }
  },
  template: '<Button v-bind="args" />',
})

export const Primary = Template.bind({})
Primary.args = {
  primary: true,
  label: 'Button',
}
```

### Best Practices for Storybook Testing

1. **Document All Variants**: Create stories for all variants of a component (e.g., primary, secondary, disabled).
2. **Test Interactions**: Include stories that demonstrate component interactions and state changes.
3. **Use Controls**: Leverage Storybook controls to make stories interactive and configurable.
4. **Visual Testing**: Use Storybook's visual testing capabilities to ensure consistent rendering across different environments.

## Cross-Framework Testing

Mission Platform supports writing components once and using them across multiple frameworks (currently Vue 3 and React). Ensure that your tests cover both frameworks to maintain consistency.

### Testing Vue 3 Components

Vue 3 components are tested using the standard Vitest and Playwright setup.

### Testing React Components

React components are tested using the same tools but with React-specific configurations.

## Additional Resources

- **[Development Setup](development-setup.md)**: For installation and environment setup.
- **[Package Development](package-development.md)**: For guidelines on developing packages with testing in mind.
- **[Architecture Guide](architecture.md)**: For an overview of the project structure and testing integration.

## Troubleshooting

### Common Issues

1. **Test Failures**: Ensure that all dependencies are correctly installed and that the environment is properly set up.
2. **Storybook Errors**: Check that all component stories are correctly written and that dependencies are resolved.
3. **Playwright Timeouts**: Increase timeouts for slower environments or complex interactions.

### Getting Help

If you encounter issues with testing, refer to the following resources:
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Storybook Documentation](https://storybook.js.org/)

For platform-specific issues, consult the [Development Setup](development-setup.md) guide or reach out to the community for support.
