---
"@mission-platform/forge-plugin-solid": patch
---

Prevent Solid dynamic-expression memoization from capturing callback-local bindings, and emit createMemo declarations after component body locals so eager memo evaluation cannot hit TDZ.
