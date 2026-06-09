---
'@mission-platform/components': major
---

Move `BaseMonacoEditor` (and its `MonacoEditorLanguage` / `MonacoEditorTheme`
type aliases) from the main barrel to a dedicated `./monaco` subpath export so
apps that don't render a code editor pay no Monaco / language-worker bundle
cost. The component is now exported as an async (dynamically imported)
component, so even consumers that opt in only pay the load cost lazily on
first mount.

**Migration:**

```diff
-import { BaseMonacoEditor } from '@mission-platform/components'
-import type { MonacoEditorLanguage, MonacoEditorTheme } from '@mission-platform/components'
+import { BaseMonacoEditor } from '@mission-platform/components/monaco'
+import type { MonacoEditorLanguage, MonacoEditorTheme } from '@mission-platform/components/monaco'
```
