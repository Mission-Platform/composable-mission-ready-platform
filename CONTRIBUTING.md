# Contributing to Mission Platform

## Getting Started

1. **Select correct Node version**: `nvm use` (uses `.nvmrc` - Node.js 24.19.0)
2. **Install dependencies**: `pnpm install`
3. **Run tests**: `pnpm test` (or `pnpm exec turbo run test`)
4. **Run linting**: `pnpm lint` (or `pnpm exec turbo run lint`)
5. **Format code**: `pnpm format` (or `pnpm exec turbo run format`)

## Development Workflow

### Making Changes

1. Create a new branch: `git checkout -b feature/your-feature`
2. Make your changes following the project conventions
3. Test your changes thoroughly
4. Run linting and formatting checks
5. Commit your changes with Conventional Commits:
   ```bash
   git commit -m "feat(component): add new tooltip component"
   ```
   Use `pnpm exec changeset` to create a Changeset for any package changes

### Code Review

- All changes must be reviewed before merging
- Follow the project's code review guidelines
- Ensure tests are passing and coverage is adequate

## Documentation Guidelines

### When to Update Documentation

1. **New features**: Update or create API references
2. **Breaking changes**: Update migration guides
3. **Bug fixes**: Update troubleshooting documentation if applicable
4. **Package additions**: Create package documentation

### Documentation Standards

- Use Diátaxis documentation framework principles
- Follow the [Best Practices](docs/best-practices.md) guide
- Include examples in API references
- Write clear migration guides for breaking changes
- Update troubleshooting documentation for common issues

### Creating New Documentation

1. Identify gaps in existing documentation
2. Create new files in the `docs/` directory
3. Follow naming conventions (kebab-case)
4. Group related documentation in subdirectories
5. Update README.md and other documentation to include links
6. Review changes for accuracy and completeness

## Testing Strategy

### Unit Tests

- Write tests for critical paths and edge cases
- Mock external dependencies
- Keep tests fast (<100ms per test)
- Test behavior, not implementation

### Integration Tests

- Test component interactions
- Validate data flow between components and services
- Test error handling scenarios

### End-to-End Tests

- Prioritize critical user flows
- Use realistic scenarios
- Clean up test data between runs
- Run in production-like environments

## Code Quality

### TypeScript

- Always use strict mode
- Provide explicit types where it adds clarity
- Handle all possible error cases
- Never ignore type errors

### Component Development

- Write once, run anywhere using framework-neutral JSX
- Validate props with type checking
- Provide sensible defaults
- Use `update:modelValue` for v-model compatibility
- Document all slots

## Package Development

### When to Create a New Package

1. Reusable UI components
2. Framework-agnostic utilities
3. Design tokens and themes
4. Shared business logic

### Package Structure

- Follow the existing package patterns
- Include `llms.txt` explaining usage
- Maintain API documentation
- Write tests for critical functionality

## Release Process

### Creating a Release

1. Create Changesets with `pnpm exec changeset`
2. Review and commit changesets
3. Run `pnpm exec changeset version` to bump versions
4. Verify CHANGELOGs are updated
5. Run `pnpm publish` to publish packages

### Versioning

- Follow SemVer principles
- Use Conventional Commits for type determination
- Patch for bug fixes and internal refactors
- Minor for backward-compatible features
- Major for breaking changes

## Support and Troubleshooting

### Common Issues

1. **Build errors**: Check tsconfig.json paths and dependencies
2. **Runtime errors**: Check browser console and network tab
3. **Memory leaks**: Use Chrome DevTools to profile heap snapshots
4. **Performance issues**: Profile with Web Perf plugin

### Getting Help

1. Check the [Troubleshooting](docs/troubleshooting.md) guide
2. Search existing issues before creating new ones
3. Ask questions in the project communication channels
4. Provide detailed information including:
  - Node version (`node -v`)
  - Package versions (`pnpm list --depth=0`)
  - Error messages and stack traces
  - Steps to reproduce

## Security

### Best Practices

1. Never store secrets in client code
2. Validate all user inputs
3. Use secure HTTP headers
4. Regularly audit dependencies for vulnerabilities
5. Follow OWASP security guidelines

### Reporting Security Issues

1. Contact the project maintainers privately
2. Do not disclose publicly until patched
3. Follow the project's security disclosure policy

## License

By contributing, you agree that your contributions will be licensed under the project's BSD 4-Clause license. See the
LICENSE file for details.
