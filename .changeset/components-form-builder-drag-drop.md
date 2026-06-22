---
'@mission-platform/components': patch
---

fix drag-and-drop on the Vue build of the form builder and file input

`BaseFormBuilder` authored its native HTML5 drag-and-drop with React-style camelCase listeners (`onDragOver`/`onDragStart`/`onDrop`), which the Vue build hyphenated into dead events — items could be dragged but never dropped. With the Vue emitter now lowercasing native multi-word DOM events, the form builder's palette/canvas/fieldset drops work on the Vue build. `BaseFileInput`'s hand-lowercased workaround (`onDragover`/`onDragleave`) is restored to the canonical React-style casing so its drop zone works on **both** the React and Vue builds.
