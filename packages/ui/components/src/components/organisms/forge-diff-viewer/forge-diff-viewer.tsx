import {
  classNames,
  Slot,
  useState,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';

import styles from './forge-diff-viewer.module.scss';

export type DiffViewerMode = 'unified' | 'split';
export type DiffLineType = 'context' | 'addition' | 'deletion';

export interface DiffViewerLine {
  id: string;
  type: DiffLineType;
  content: string;
  oldLine?: number;
  newLine?: number;
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface DiffViewerStyleProperties {
  readonly 'border-width-thick'?: string;
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-inverse'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-border-focus'?: string;
  readonly 'color-error-subtle'?: string;
  readonly 'color-error-text'?: string;
  readonly 'color-primary-default'?: string;
  readonly 'color-success-subtle'?: string;
  readonly 'color-success-text'?: string;
  readonly 'color-text-on-inverse'?: string;
  readonly 'color-text-on-primary'?: string;
  readonly 'font-family-mono'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'font-size-xs'?: string;
  readonly 'line-height-relaxed'?: string;
  readonly 'line-height-tight'?: string;
  readonly 'radius-md'?: string;
  readonly 'radius-sm'?: string;
  readonly 'size-height-lg'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
}

export type DiffViewerStyle = CSSStyleProperties & {
  readonly '--forge-diff-viewer-border-width-thick'?: string | undefined;
  readonly '--forge-diff-viewer-border-width-thin'?: string | undefined;
  readonly '--forge-diff-viewer-color-bg-inverse'?: string | undefined;
  readonly '--forge-diff-viewer-color-border-default'?: string | undefined;
  readonly '--forge-diff-viewer-color-border-focus'?: string | undefined;
  readonly '--forge-diff-viewer-color-error-subtle'?: string | undefined;
  readonly '--forge-diff-viewer-color-error-text'?: string | undefined;
  readonly '--forge-diff-viewer-color-primary-default'?: string | undefined;
  readonly '--forge-diff-viewer-color-success-subtle'?: string | undefined;
  readonly '--forge-diff-viewer-color-success-text'?: string | undefined;
  readonly '--forge-diff-viewer-color-text-on-inverse'?: string | undefined;
  readonly '--forge-diff-viewer-color-text-on-primary'?: string | undefined;
  readonly '--forge-diff-viewer-font-family-mono'?: string | undefined;
  readonly '--forge-diff-viewer-font-size-sm'?: string | undefined;
  readonly '--forge-diff-viewer-font-size-xs'?: string | undefined;
  readonly '--forge-diff-viewer-line-height-relaxed'?: string | undefined;
  readonly '--forge-diff-viewer-line-height-tight'?: string | undefined;
  readonly '--forge-diff-viewer-radius-md'?: string | undefined;
  readonly '--forge-diff-viewer-radius-sm'?: string | undefined;
  readonly '--forge-diff-viewer-size-height-lg'?: string | undefined;
  readonly '--forge-diff-viewer-spacing-1'?: string | undefined;
  readonly '--forge-diff-viewer-spacing-2'?: string | undefined;
  readonly '--forge-diff-viewer-spacing-3'?: string | undefined;
  readonly '--forge-diff-viewer-spacing-4'?: string | undefined;
};

function createDiffViewerStyle(
  properties: Readonly<DiffViewerStyleProperties> | undefined,
): DiffViewerStyle | undefined {
  return createForgeStyle({
    '--forge-diff-viewer-border-width-thick': properties?.['border-width-thick'],
    '--forge-diff-viewer-border-width-thin': properties?.['border-width-thin'],
    '--forge-diff-viewer-color-bg-inverse': properties?.['color-bg-inverse'],
    '--forge-diff-viewer-color-border-default': properties?.['color-border-default'],
    '--forge-diff-viewer-color-border-focus': properties?.['color-border-focus'],
    '--forge-diff-viewer-color-error-subtle': properties?.['color-error-subtle'],
    '--forge-diff-viewer-color-error-text': properties?.['color-error-text'],
    '--forge-diff-viewer-color-primary-default': properties?.['color-primary-default'],
    '--forge-diff-viewer-color-success-subtle': properties?.['color-success-subtle'],
    '--forge-diff-viewer-color-success-text': properties?.['color-success-text'],
    '--forge-diff-viewer-color-text-on-inverse': properties?.['color-text-on-inverse'],
    '--forge-diff-viewer-color-text-on-primary': properties?.['color-text-on-primary'],
    '--forge-diff-viewer-font-family-mono': properties?.['font-family-mono'],
    '--forge-diff-viewer-font-size-sm': properties?.['font-size-sm'],
    '--forge-diff-viewer-font-size-xs': properties?.['font-size-xs'],
    '--forge-diff-viewer-line-height-relaxed': properties?.['line-height-relaxed'],
    '--forge-diff-viewer-line-height-tight': properties?.['line-height-tight'],
    '--forge-diff-viewer-radius-md': properties?.['radius-md'],
    '--forge-diff-viewer-radius-sm': properties?.['radius-sm'],
    '--forge-diff-viewer-size-height-lg': properties?.['size-height-lg'],
    '--forge-diff-viewer-spacing-1': properties?.['spacing-1'],
    '--forge-diff-viewer-spacing-2': properties?.['spacing-2'],
    '--forge-diff-viewer-spacing-3': properties?.['spacing-3'],
    '--forge-diff-viewer-spacing-4': properties?.['spacing-4'],
  }) as DiffViewerStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface DiffViewerProperties {
  oldText: string;
  newText: string;
  mode?: DiffViewerMode;
  language?: string;
  showLineNumbers?: boolean;
  fileName?: string;
  header?: MpChild;
  ariaLabel?: string;
  onModeChange?: (mode: DiffViewerMode) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<DiffViewerStyleProperties>;
}

function createDiffLines(oldText: string, newText: string): DiffViewerLine[] {
  const oldLines = oldText === '' ? [] : oldText.split('\n');
  const newLines = newText === '' ? [] : newText.split('\n');
  const table: number[][] = Array.from({ length: oldLines.length + 1 }, () =>
    Array.from({ length: newLines.length + 1 }, () => 0),
  );
  for (let oldIndex = oldLines.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newLines.length - 1; newIndex >= 0; newIndex -= 1) {
      table[oldIndex][newIndex] =
        oldLines[oldIndex] === newLines[newIndex]
          ? table[oldIndex + 1][newIndex + 1] + 1
          : Math.max(table[oldIndex + 1][newIndex], table[oldIndex][newIndex + 1]);
    }
  }
  const lines: DiffViewerLine[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (oldIndex < oldLines.length && newIndex < newLines.length && oldLines[oldIndex] === newLines[newIndex]) {
      lines.push({
        id: `context-${oldIndex}-${newIndex}`,
        type: 'context',
        content: oldLines[oldIndex],
        oldLine: oldIndex + 1,
        newLine: newIndex + 1,
      });
      oldIndex += 1;
      newIndex += 1;
    } else if (
      newIndex < newLines.length &&
      (oldIndex === oldLines.length || table[oldIndex][newIndex + 1] >= table[oldIndex + 1][newIndex])
    ) {
      lines.push({ id: `addition-${newIndex}`, type: 'addition', content: newLines[newIndex], newLine: newIndex + 1 });
      newIndex += 1;
    } else {
      lines.push({ id: `deletion-${oldIndex}`, type: 'deletion', content: oldLines[oldIndex], oldLine: oldIndex + 1 });
      oldIndex += 1;
    }
  }
  return lines;
}

export function ForgeDiffViewer(properties: Readonly<DiffViewerProperties>): MpElement {
  const style = createDiffViewerStyle(properties.properties);

  const {
    oldText,
    newText,
    mode: suppliedMode,
    language,
    showLineNumbers = true,
    fileName,
    ariaLabel = 'Code diff',
  } = properties;
  const [mode, setMode] = useState<DiffViewerMode>(suppliedMode ?? 'unified');
  const lines = createDiffLines(oldText, newText);
  const changeMode = (next: DiffViewerMode): void => {
    setMode(next);
    properties.onModeChange?.(next);
  };

  return (
    <section
      aria-label={ariaLabel}
      className={classNames(styles['forge-diff-viewer'], language ? `forge-diff-viewer--${language}` : undefined)}
      style={style}
    >
      <header className={styles['forge-diff-viewer__header']}>
        <Slot name="header">{fileName ? <strong>{fileName}</strong> : <span />}</Slot>
        <div
          aria-label="Diff display mode"
          className={styles['forge-diff-viewer__modes']}
          role="group"
        >
          <button
            aria-pressed={mode === 'unified'}
            type="button"
            onClick={() => changeMode('unified')}
          >
            Unified
          </button>
          <button
            aria-pressed={mode === 'split'}
            type="button"
            onClick={() => changeMode('split')}
          >
            Split
          </button>
        </div>
      </header>
      {mode === 'split' ? (
        <div className={styles['forge-diff-viewer__split']}>
          <div>
            <h3>Original</h3>
            <pre>
              {lines
                .filter((line) => line.type !== 'addition')
                .map((line) => (
                  <code
                    className={classNames(
                      styles['forge-diff-viewer__line'],
                      styles[`forge-diff-viewer__line--${line.type}`],
                    )}
                    key={line.id}
                  >
                    {showLineNumbers ? (
                      <span className={styles['forge-diff-viewer__number']}>{line.oldLine ?? ''}</span>
                    ) : undefined}
                    {line.content}
                    {'\n'}
                  </code>
                ))}
            </pre>
          </div>
          <div>
            <h3>Changed</h3>
            <pre>
              {lines
                .filter((line) => line.type !== 'deletion')
                .map((line) => (
                  <code
                    className={classNames(
                      styles['forge-diff-viewer__line'],
                      styles[`forge-diff-viewer__line--${line.type}`],
                    )}
                    key={line.id}
                  >
                    {showLineNumbers ? (
                      <span className={styles['forge-diff-viewer__number']}>{line.newLine ?? ''}</span>
                    ) : undefined}
                    {line.content}
                    {'\n'}
                  </code>
                ))}
            </pre>
          </div>
        </div>
      ) : (
        <pre className={styles['forge-diff-viewer__unified']}>
          {lines.map((line) => (
            <code
              className={classNames(styles['forge-diff-viewer__line'], styles[`forge-diff-viewer__line--${line.type}`])}
              key={line.id}
            >
              {showLineNumbers ? (
                <span className={styles['forge-diff-viewer__number']}>{line.oldLine ?? line.newLine ?? ''}</span>
              ) : undefined}
              <span aria-hidden="true">{line.type === 'addition' ? '+' : line.type === 'deletion' ? '−' : ' '}</span>
              {line.content}
              {'\n'}
            </code>
          ))}
        </pre>
      )}
    </section>
  );
}
