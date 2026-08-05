// ─── @mission-platform/wysiwyg ──────────────────────────────────────────────
// Framework-agnostic WYSIWYG rich-text editor for Mission Platform, authored
// once in the neutral JSX dialect (`@mission-platform/forge`) and compiled to both
// Vue 3 (`./vue`) and React (`./react`) by `@mission-platform/vite-plugin-forge`.

export {
  BaseWysiwygBlockControls,
  type WysiwygBlockAlign,
  type WysiwygBlockControlsGeometry,
  type WysiwygBlockControlsProperties,
} from './molecules/base-wysiwyg-block-controls';
export { BaseWysiwygBlockMenu, blockFormatLabel, type WysiwygBlockMenuProperties } from './molecules/base-wysiwyg-block-menu';
export { BaseWysiwygEditor, type WysiwygEditorProperties } from './organisms/base-wysiwyg-editor';
export {
  BaseWysiwygStatusBar,
  type WysiwygStatusBarAlign,
  type WysiwygStatusBarProperties,
  type WysiwygStatusItem,
} from './molecules/base-wysiwyg-status-bar';
export { BaseWysiwygToolbar, type WysiwygToolbarItem, type WysiwygToolbarProperties } from './molecules/base-wysiwyg-toolbar';
export { BaseWysiwygToolbarButton, type WysiwygToolbarButtonProperties } from './atoms/base-wysiwyg-toolbar-button';

// Public prop/callback types surfaced across the editor's API, re-exported from
// the package entry so consumers can import them directly (the `labels` prop's
// `WysiwygLabels` and the `onStats` callback's `EditorStats`). The code-block
// dialog's `CodeBlockLanguage` is owned by `@mission-platform/components` and is
// imported from there directly — re-exporting it here is not possible because
// the JSX compiler rewrites the component-package import to a relative path that
// does not resolve in the generated declarations.
export { type WysiwygLabels } from '../utils/labels';
export { type EditorStats } from '../utils/text-stats';
