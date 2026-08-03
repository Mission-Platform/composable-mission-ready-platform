# Development Setup

This guide will help you set up your development environment to work with Mission Platform.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Tools

1. **Node.js** (version specified in `.nvmrc`: v24.18.0)
   - Recommended: Use [nvm](https://github.com/nvm-sh/nvm) to manage Node versions
   ```bash
   nvm install
   nvm use
   ```

2. **pnpm** (package manager)
   ```bash
   corepack use pnpm
   ```

3. **Git** (version control)
   - Ensure you have Git installed and configured with your SSH keys

4. **Docker** (optional, for Hunspell WebAssembly build)
   - Required only if you need to rebuild the Hunspell WebAssembly module

## Setting Up the Repository

### 1. Clone the Repository

```bash
git clone git@github.com:Mission-Platform/composable-mission-ready-platform.git
cd composable-mission-ready-platform
```

### 2. Install Dependencies

The repository uses pnpm workspaces, so install all dependencies with:

```bash
pnpm install
```

This will:
- Install all workspace packages and their dependencies
- Set up Husky git hooks for commit message validation
- Create necessary build directories

### 3. Verify Installation

Check that everything is set up correctly:

```bash
# Check Node version
node --version
# Should match the version in .nvmrc (v24.18.0)

# Check pnpm version
pnpm --version

# Run a quick build test
pnpm exec turbo run build --filter @mission-platform/forge
```

## Development Workflow

### Running Storybook (Component Development)

Storybook is the primary environment for developing and testing components:

```bash
# Start Vue 3 Storybook on port 6006
pnpm exec turbo run storybook --filter @mission-platform/storybook

# Start React Storybook on port 6007 (optional)
pnpm exec turbo run storybook-react --filter @mission-platform/storybook-react
```

### Running My Care Notes App

The My Care Notes application demonstrates the platform in action:

```bash
# Start development server
pnpm exec turbo run dev --filter @mission-platform/my-care-notes

# The app will be available at http://localhost:5173
```

### Building Packages

Build individual packages or the entire workspace:

```bash
# Build a specific package
pnpm exec turbo run build --filter @mission-platform/forge

# Build all packages
pnpm exec turbo run build --filter "./packages/*"

# Build everything (apps + packages + configs)
pnpm exec turbo run build
```

### Running Tests

Run tests across the entire workspace:

```bash
# Run all tests
turbo run test

# Run tests for a specific package
turbo run test --filter=@mission-platform/components

# Run only affected tests (based on git changes)
turbo run test --affected
```

## Code Quality Tools

### Linting

Check code quality across all workspaces:

```bash
# Run ESLint
turbo run lint

# Fix auto-fixable issues
turbo run lint --filter="./packages/*" -- --fix
```

### Formatting

Format code with Prettier:

```bash
# Check formatting
turbo run format:check

# Apply formatting
turbo run format:write
```

## Working with Packages

### Adding a New Package

1. Create the package directory:
   ```bash
   mkdir packages/my-new-package
   cd packages/my-new-package
   ```

2. Initialize package.json:
   ```bash
   pnpm init -w --scope=@mission-platform/my-new-package
   ```

3. Add essential files:
   ```bash
   # Create tsconfig.json
   echo '{"extends": "../../configs/typescript-config/base.json"}' > tsconfig.json
   
   # Create vite.config.ts
   echo 'import { defineLibraryConfig } from "@mission-platform/vite-config"
export default defineLibraryConfig()' > vite.config.ts
   ```

4. Add to pnpm-workspace.yaml:
   ```yaml
   packages:
     - "packages/my-new-package"
   ```

5. Install dependencies:
   ```bash
   pnpm add @mission-platform/eslint-config @mission-platform/prettier-config @mission-platform/typescript-config --save-dev --filter=@mission-platform/my-new-package
   ```

### Developing a Package

```bash
# Watch mode for development
pnpm dev --filter=@mission-platform/my-new-package

# Build the package
pnpm build --filter=@mission-platform/my-new-package
```

## Environment Variables

Some packages and apps require environment variables. Create a `.env` file in the root directory:

```bash
# Copy the example file
cp .env.example .env

# Edit as needed
nano .env
```

## Troubleshooting

### Node Version Issues

If you encounter Node version errors:

```bash
# Make sure you're using the correct Node version
nvm use

# Or install it if missing
nvm install
```

### Dependency Installation Problems

```bash
# Clear pnpm cache
pnpm store prune

# Delete node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Build Failures

```bash
# Clean build artifacts
pnpm run clean

# Try building again
turbo run build
```

## Next Steps

Now that your development environment is set up, you can:

1. **Explore the codebase** - Start with the core packages like `@mission-platform/forge` and `@mission-platform/components`
2. **Run Storybook** to see available components and their documentation
3. **Build and run My Care Notes** to experience a complete application built with Mission Platform
4. **Check out the contribution guidelines** in [Contributing](contributing.md)

---

**Last updated**: 2024-12-15
