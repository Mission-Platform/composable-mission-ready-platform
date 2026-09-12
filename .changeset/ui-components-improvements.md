---
"@mission-platform/components": minor
"@mission-platform/select": minor
---

### ForgeTable
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