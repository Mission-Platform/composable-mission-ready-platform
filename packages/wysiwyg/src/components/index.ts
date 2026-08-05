// ─── @mission-platform/wysiwyg ──────────────────────────────────────────────
// Framework-agnostic WYSIWYG rich-text editor for Mission Platform, authored
// once in the neutral JSX dialect (`@mission-platform/forge`) and compiled to both
// Vue 3 (`./vue`) and React (`./react`) by `@mission-platform/vite-plugin-forge`.

export {
  ForgeWysiwygBlockControls,
  type WysiwygBlockAlign,
  type WysiwygBlockControlsGeometry,
  type WysiwygBlockControlsProperties,
} from './molecules/forge-wysiwyg-block-controls';
export {
  ForgeWysiwygBlockMenu,
  blockFormatLabel,
  type WysiwygBlockMenuProperties,
} from './molecules/forge-wysiwyg-block-menu';
export { ForgeWysiwygEditor, type WysiwygEditorProperties } from './organisms/forge-wysiwyg-editor';
export {
  ForgeWysiwygStatusBar,
  type WysiwygStatusBarAlign,
  type WysiwygStatusBarProperties,
  type WysiwygStatusItem,
} from './molecules/forge-wysiwyg-status-bar';
export {
  ForgeWysiwygToolbar,
  type WysiwygToolbarItem,
  type WysiwygToolbarProperties,
} from './molecules/forge-wysiwyg-toolbar';
export { ForgeWysiwygToolbarButton, type WysiwygToolbarButtonProperties } from './atoms/forge-wysiwyg-toolbar-button';

// Public prop/callback types surfaced across the editor's API, re-exported from
// the package entry so consumers can import them directly (the `labels` prop's
// `WysiwygLabels` and the `onStats` callback's `EditorStats`). The code-block
// dialog's `CodeBlockLanguage` is owned by `@mission-platform/components` and is
// imported from there directly — re-exporting it here is not possible because
// the JSX compiler rewrites the component-package import to a relative path that
// does not resolve in the generated declarations.
export { type WysiwygLabels } from '../utils/labels';
export { type EditorStats } from '../utils/text-stats';
