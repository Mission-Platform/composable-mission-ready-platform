# @mission-platform/forge-adapters

## 1.2.1

### Patch Changes

- cb5f5ca: configure packages for public access
- Updated dependencies [cb5f5ca]
  - @mission-platform/forge-jsx@2.0.1

## 1.2.0
### Minor Changes

- 355f413: split the Forge JSX runtime from its framework adapters
  
  BREAKING CHANGE: replace `@mission-platform/forge` imports with `@mission-platform/forge-jsx` for neutral runtime APIs and `@mission-platform/forge-adapters/<framework>` for framework adapters.
- edc494d: support kebab-case HTML attribute observation, property reflection, and form association in ForgeElement

### Patch Changes

- 0e9305d: Export `ForgeCodeScanner` component from root entry, support Web Components context imports and component alias exports, and preserve shared CMS assets during framework builds.
- 7e3cc9d: ignore generated package files during formatting
- Updated dependencies [355f413]
  - @mission-platform/forge-jsx@2.0.0
