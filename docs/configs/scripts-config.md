# Scripts Configuration

This document explains the purpose and usage of utility scripts in the `scripts/` directory.

## Current Status

The `scripts/` directory contains several utility scripts used for project maintenance and automation, including:
- `i18n-extract.ts`: Utility for extracting internationalization strings.

## Purpose

The `scripts/` directory contains reusable command-line utilities that support development, deployment, and maintenance tasks across the Mission Platform monorepo. These scripts help standardize operations and reduce duplication of effort.

## When to Add a Script

Add a script to the `scripts/` directory when:

1. **Reusability**: The script is used across multiple projects or teams
2. **Complexity**: The task has logic that would be difficult to maintain inline
3. **Standardization**: You want to create a consistent pattern for common operations
4. **Documentation**: The script performs a complex operation that needs clear documentation

## Script Template

Each script should include:

```bash
#!/bin/bash
# script-name.sh
# Brief description of what the script does
# 
# Usage: ./script-name.sh [options]
#
# Options:
#   -h, --help     Show help message
#   -v, --version  Show version
#   -c, --config   Path to config file (default: ./config.json)
#
# Examples:
#   ./script-name.sh
#   ./script-name.sh -c ./my-config.json
#   ./script-name.sh --help

# Implementation details
# ... script logic here ...
```

## Development Guidelines

### 1. Naming Conventions
- Use kebab-case for script names: `generate-seo-files.sh`
- Prefix with domain if needed: `ci/run-tests.sh`
- Avoid generic names that might conflict with system commands

### 2. Documentation Requirements
Every script must include:
- Clear description of purpose and functionality
- Usage examples with expected output
- List of available options and flags
- Error handling documentation
- Prerequisites or dependencies

### 3. Code Quality
- Include shebang `#!/bin/bash` at the top
- Use descriptive variable names
- Add comments for complex logic sections
- Implement proper error checking with `set -e` and `set -u`
- Validate inputs and provide helpful error messages

### 4. Testing
- Test scripts in a clean environment
- Verify they work with different input scenarios
- Document test cases in the script comments
- Include example outputs for common use cases

## Best Practices

1. **Keep scripts focused**: Each script should do one thing well
2. **Use descriptive names**: Make it clear what the script does
3. **Include error handling**: Check for errors and exit appropriately
4. **Document everything**: Assume no one will read your script without documentation
5. **Test thoroughly**: Verify scripts work in different environments
6. **Version control**: All scripts must be committed to version control
7. **Share across teams**: Make reusable scripts available to all teams

## Cross-Reference Documentation

- [Development Setup](docs/development-setup.md)
- [Package Development](docs/package-development.md)
- [Testing](docs/testing.md)
- [Build System](docs/build-system.md)

This comprehensive approach ensures the `scripts/` directory remains organized, maintainable, and valuable to the entire Mission Platform team.