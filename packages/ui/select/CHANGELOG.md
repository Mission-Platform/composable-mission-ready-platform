# @mission-platform/select

## 1.2.2

### Patch Changes

- 8be0da7: address deepsource code quality, complexity, and documentation issues
- 8be0da7: resolve documentation warnings and format generated API references
- 8be0da7: optimize turbo pipeline, standardize type-check task, and consolidate package build scripts
- 8be0da7: Resolve code review and DeepSource code quality, documentation, and complexity issues.
- 8be0da7: resolve DeepSource code quality, documentation, complexity, and typing issues
- 8be0da7: split monolithic tsdown configs into discrete target configs and purge vestigial vite configs
- Updated dependencies [8be0da7]
- Updated dependencies [8be0da7]
- Updated dependencies [8be0da7]
- Updated dependencies [8be0da7]
  - @mission-platform/forge-jsx@2.0.2
  - @mission-platform/float@1.2.2
  - @mission-platform/forge-adapters@1.2.2
  - @mission-platform/icons@2.0.4
  - @mission-platform/typography@1.1.3

## 1.2.1

### Patch Changes

- cb5f5ca: configure packages for public access
- Updated dependencies [cb5f5ca]
  - @mission-platform/float@1.2.1
  - @mission-platform/forge-adapters@1.2.1
  - @mission-platform/forge-jsx@2.0.1
  - @mission-platform/icons@2.0.3
  - @mission-platform/typography@1.1.2

## 1.2.0
### Minor Changes

- edc494d: support table sticky column pinning and row expansion, multiselect tag truncation, and modal prop fallbacks
- b7965b5: ### ForgeTable
  - Add row selection (`selectable`, `selectedRowKeys`, `onSelectionChange`, `onSelectRow`) with indeterminate select-all state.
  - Add accordion row expansion (`expandable`, `expandedRowKeys`, `expandedRowRender`, `onExpansionChange`).
  - Add sticky column pinning (`fixed: 'left' | 'right'`) with cumulative offset positioning.
  - Add scoped `cell` slot rendering (`MpRenderProperty<TableCellScope>`) matching `ForgeVirtualTable` capabilities.
  - Add keyboard sorting activation (Enter/Space) and focusability to sortable column headers.
  
  ### ForgeTabs
  - Remove invalid `role="tab"` from tab close button to restore valid WAI-ARIA `tablist` semantics.
  
  ### ForgeSplitPane
  - Add mouse and touch pointer drag resizing via `beginPointerDrag` alongside keyboard resizing support.
  
  ### ForgeTreeView
  - Implement full WAI-ARIA Tree View keyboard navigation (`ArrowDown`, `ArrowUp`, `Home`, `End`) across visible nodes.
  
  ### ForgeMultiselect
  - Add `maxTags` truncation with normalized integer count and collapsed `+N more` tag indicator.
- c5e5923: prevent search race conditions on dropdown close and unmount, ensure valid ARIA listbox child semantics, and improve TypeScript typing for async search

### Patch Changes

- 7788642: Render the language switcher without an implicit icon sprite provider.
- Updated dependencies [0e9305d]
- Updated dependencies [355f413]
- Updated dependencies [7788642]
- Updated dependencies [7e3cc9d]
- Updated dependencies [7788642]
- Updated dependencies [edc494d]
- Updated dependencies [e28d622]
- Updated dependencies [edc494d]
  - @mission-platform/forge-adapters@1.2.0
  - @mission-platform/forge-jsx@2.0.0
  - @mission-platform/icons@2.0.2
  - @mission-platform/float@1.2.0
  - @mission-platform/typography@1.1.1

## 1.1.0

### Minor Changes

- 9e59f09: split shared UI capabilities into focused workspaces and update their design tokens
- 97c3f20: add typed custom-property overrides for visual components

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- 8a15dbc: add generated package API references and build-time documentation extraction
- Updated dependencies [c32bb83]
- Updated dependencies [f216404]
- Updated dependencies [89aab02]
- Updated dependencies [8a15dbc]
- Updated dependencies [46fe17a]
- Updated dependencies [9e59f09]
- Updated dependencies [97c3f20]
  - @mission-platform/float@1.1.0
  - @mission-platform/forge-jsx@1.1.0
  - @mission-platform/icons@2.0.1
  - @mission-platform/typography@1.1.0
