# Circular Dependency Troubleshooting Guide

## Understanding Circular Dependencies

Circular dependencies occur when Package A imports from Package B, and Package B (directly or indirectly) imports from Package A. This creates a circular reference that can cause:

- Build failures
- Runtime errors
- Unexpected behavior
- Difficult debugging

## Detection

The Mission Platform uses ESLint with the `no-restricted-paths` rule to detect and prevent dependency violations, including potential circular dependencies.

Run this command to check for import issues:
```bash
npm run lint -- --fix
```

## Fixing Circular Dependencies

### 1. Identify the Circular Dependency
When you encounter an error about circular dependencies, ESLint will indicate the problematic imports. Look for patterns like:

```
packages/a/src/fileA.ts
import { something } from '../../packages/b/src/fileB.ts'

packages/b/src/fileB.ts
import { anotherThing } from '../../../packages/a/src/fileA.ts'
```

### 2. Apply the Fix Strategy
Choose one of these approaches based on your situation:

#### Option A: Extract Shared Code
Move shared functionality to a new package that both packages can import.

**Before:**
- Package A depends on Package B
- Package B depends on Package A

**After:**
- Create Package C with shared code
- Both Package A and Package B depend on Package C

#### Option B: Refactor Dependencies
Restructure your code to eliminate the circular dependency.

**Before:**
```ts
// packages/a/src/fileA.ts
import { bFunction } from '../b/fileB';

export function aFunction() {
  return bFunction();
}

// packages/b/src/fileB.ts
import { aFunction } from '../a/fileA';

export function bFunction() {
  return aFunction();
}
```

**After:**
```ts
// packages/a/src/fileA.ts
import { bFunction } from './b/fileB';

export function aFunction() {
  return bFunction();
}

// packages/b/src/fileB.ts
export function bFunction() {
  // Move shared logic to package A or create separate module
  return 'result';
}
```

### 3. Update Package Dependencies
After fixing the circular dependency, update your package.json files:

```json
{
  "dependencies": {
    "@mission-platform/shared-utils": "workspace:^1.0.0"
  }
}
```

## Prevention Best Practices

1. **Follow Dependency Direction**: Always maintain `apps/` → `packages/` flow
2. **Use Shared Packages**: Put common utilities in shared packages instead of importing between sibling packages
3. **Limit Package Coupling**: Minimize direct imports between packages; use events or services for communication
4. **Regular Audits**: Run linting checks frequently to catch dependency issues early
5. **Design for Extensibility**: Structure packages with clear boundaries and minimal overlap

## Example Fix

**Problematic Structure:**
```
packages/user-management/
  ├── src/index.ts
  └── services/userService.ts

packages/auth-system/
  ├── src/index.ts
  └── services/authService.ts
```

Where userService imports from authService and vice versa.

**Solution:**
```
packages/user-management/
  ├── src/index.ts
  └── services/userService.ts

packages/auth-system/
  ├── src/index.ts
  └── services/authService.ts

packages/shared-services/
  ├── src/interfaces/service.ts
  └── index.ts
```

Now both user-management and auth-system depend on shared-services instead of each other.