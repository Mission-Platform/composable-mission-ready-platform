import { ForgeBadge, ForgeBreadcrumb, ForgeButton } from '@mission-platform/components';
import type { MpElement } from '@mission-platform/forge-jsx';

import styles from './forge-flint-graph-editor.module.scss';

import type { FlintRendererBridge } from './useBackendPassDispatcher';
import type { FlintEditorStore, FlintEditorStoreState } from '../../../editor/editor-store';
import type { FlintPerformanceMetrics } from '../../../renderer/render-worker';

export interface FlintGraphToolbarProperties {
  readonly editorState: FlintEditorStoreState;
  readonly resolvedTheme: 'light' | 'dark';
  readonly isFallback: boolean;
  readonly perfMetrics: FlintPerformanceMetrics;
  readonly store: FlintEditorStore;
  readonly bridge?: FlintRendererBridge;
  readonly onRun: () => void;
  readonly onExport: () => void;
  readonly onToggleTheme: () => void;
  readonly onOpenPerf: () => void;
}

export function FlintGraphToolbar(properties: FlintGraphToolbarProperties): MpElement {
  const { editorState, resolvedTheme, isFallback, perfMetrics, store, onRun, onExport, onToggleTheme, onOpenPerf } =
    properties;

  const breadcrumbItems = (editorState.breadcrumbs ?? [{ id: 'root', title: 'Main Graph' }]).map((crumb) => ({
    label: crumb.title,
    onClick: () => {
      store.navigateBack();
    },
  }));

  return (
    <header className={styles.editorToolbar}>
      <div className={styles.toolbarLeft}>
        <ForgeBreadcrumb items={breadcrumbItems} />
      </div>

      <div className={styles.toolbarCenter}>
        <ForgeBadge variant={isFallback ? 'warning' : 'success'}>
          {isFallback ? 'Canvas 2D Fallback' : 'GPU Accelerated'}
        </ForgeBadge>
        <span
          className={styles.perfSummary}
          onClick={onOpenPerf}
        >
          {perfMetrics.totalFrameTimeMs.toFixed(1)}ms ({perfMetrics.visibleNodesCount} nodes)
        </span>
      </div>

      <div className={styles.toolbarRight}>
        <ForgeButton
          variant="secondary"
          size="sm"
          onClick={onToggleTheme}
        >
          {resolvedTheme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </ForgeButton>
        <ForgeButton
          variant="secondary"
          size="sm"
          onClick={onExport}
        >
          Export
        </ForgeButton>
        <ForgeButton
          variant="primary"
          size="sm"
          onClick={onRun}
        >
          ▶ Run
        </ForgeButton>
      </div>
    </header>
  );
}
