import { classNames, type MpChild, type MpElement, Slot, useState } from '@mission-platform/forge';

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
