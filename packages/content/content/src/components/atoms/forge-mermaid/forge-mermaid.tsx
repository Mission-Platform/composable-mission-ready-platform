import {
  Fragment,
  HtmlContent,
  useEffect,
  useId,
  useRef,
  useState,
  createForgeStyle,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';
import mermaid from 'mermaid';

import { mermaidThemeCSS } from './forge-mermaid-theme';
import styles from './forge-mermaid.module.scss';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface MermaidStyleProperties {
  readonly 'code-border-default'?: string;
  readonly 'code-border-width'?: string;
  readonly 'code-error-font-weight'?: string;
  readonly 'code-error-margin-bottom'?: string;
  readonly 'code-error-text'?: string;
  readonly 'code-padding'?: string;
  readonly 'code-radius'?: string;
  readonly 'code-surface-default'?: string;
  readonly 'code-text-default'?: string;
  readonly 'code-typography-font-family'?: string;
  readonly 'code-typography-font-size'?: string;
  readonly 'code-typography-line-height'?: string;
}

export type MermaidStyle = CSSStyleProperties & {
  readonly '--forge-mermaid-code-border-default'?: string | undefined;
  readonly '--forge-mermaid-code-border-width'?: string | undefined;
  readonly '--forge-mermaid-code-error-font-weight'?: string | undefined;
  readonly '--forge-mermaid-code-error-margin-bottom'?: string | undefined;
  readonly '--forge-mermaid-code-error-text'?: string | undefined;
  readonly '--forge-mermaid-code-padding'?: string | undefined;
  readonly '--forge-mermaid-code-radius'?: string | undefined;
  readonly '--forge-mermaid-code-surface-default'?: string | undefined;
  readonly '--forge-mermaid-code-text-default'?: string | undefined;
  readonly '--forge-mermaid-code-typography-font-family'?: string | undefined;
  readonly '--forge-mermaid-code-typography-font-size'?: string | undefined;
  readonly '--forge-mermaid-code-typography-line-height'?: string | undefined;
};

function createMermaidStyle(properties: Readonly<MermaidStyleProperties> | undefined): MermaidStyle | undefined {
  return createForgeStyle({
    '--forge-mermaid-code-border-default': properties?.['code-border-default'],
    '--forge-mermaid-code-border-width': properties?.['code-border-width'],
    '--forge-mermaid-code-error-font-weight': properties?.['code-error-font-weight'],
    '--forge-mermaid-code-error-margin-bottom': properties?.['code-error-margin-bottom'],
    '--forge-mermaid-code-error-text': properties?.['code-error-text'],
    '--forge-mermaid-code-padding': properties?.['code-padding'],
    '--forge-mermaid-code-radius': properties?.['code-radius'],
    '--forge-mermaid-code-surface-default': properties?.['code-surface-default'],
    '--forge-mermaid-code-text-default': properties?.['code-text-default'],
    '--forge-mermaid-code-typography-font-family': properties?.['code-typography-font-family'],
    '--forge-mermaid-code-typography-font-size': properties?.['code-typography-font-size'],
    '--forge-mermaid-code-typography-line-height': properties?.['code-typography-line-height'],
  }) as MermaidStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface ForgeMermaidProperties {
  /** Mermaid source to render. */
  code: string;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<MermaidStyleProperties>;
}

async function loadDiagram({ code, diagramId }: { code: string; diagramId: string }) {
  mermaid.initialize({
    securityLevel: 'strict',
    startOnLoad: false,
    theme: 'base',
    themeCSS: mermaidThemeCSS,
  });

  const result = await mermaid.render(diagramId, code);

  return result;
}

type MermaidRenderResult = Awaited<ReturnType<typeof loadDiagram>>;

/**
 * Renders a Mermaid block with an accessible source fallback. Mermaid is bundled
 * with the component so client rendering does not depend on a separate lazy
 * chunk; browser APIs are still called only from the client effect.
 */
export function ForgeMermaid(properties: Readonly<ForgeMermaidProperties>): MpElement {
  const style = createMermaidStyle(properties.properties);

  const { code } = properties;
  const generatedId = useId();
  const diagramId = `forge-mermaid-${generatedId.replaceAll(/[^a-zA-Z0-9_-]/g, '')}`;
  // Mermaid removes existing elements matching its render id before creating a
  // new diagram. Keep that internal id separate from the Vue-owned host id so
  // Mermaid cannot remove a node while Vue is patching the async result.
  const renderId = `forge-mermaid-render-${generatedId.replaceAll(/[^a-zA-Z0-9_-]/g, '')}`;
  const diagramReference = useRef<HTMLDivElement | null>(null);
  const [renderError, setRenderError] = useState<boolean>(false);
  // The explicit initial value keeps the neutral hook type safe while allowing
  // the render result to remain absent until the async Mermaid call resolves.
  // eslint-disable-next-line unicorn/no-useless-undefined
  const [renderedDiagram, setRenderedDiagram] = useState<MermaidRenderResult | undefined>(undefined);

  useEffect(() => {
    let active = true;
    setRenderError(false);
    setRenderedDiagram(undefined);

    loadDiagram({ code, diagramId: renderId })
      .then((result) => {
        if (active) setRenderedDiagram(result);
      })
      .catch(() => {
        if (active) setRenderError(true);
      });

    return () => {
      active = false;
    };
  }, [code, diagramId]);

  useEffect(() => {
    const host = diagramReference.current;
    if (renderedDiagram === undefined || host === null) return;

    renderedDiagram.bindFunctions?.(host);
  }, [renderedDiagram]);

  return (
    <Fragment>
      <ForgeTypography
        variant="body-md"
        as="p"
      >
        Diagram
      </ForgeTypography>
      {renderedDiagram === undefined ? (
        <div
          aria-label={renderError ? 'Mermaid diagram source' : 'Mermaid diagram'}
          className={styles['forge-mermaid']}
          id={diagramId}
          role="img"
          style={style}
        >
          {renderError ? (
            <div
              className={styles['forge-mermaid__error']}
              role="alert"
            >
              <p>Unable to render this Mermaid diagram. Source:</p>
              <pre>{code}</pre>
            </div>
          ) : (
            <pre className={styles['forge-mermaid__fallback']}>{code}</pre>
          )}
        </div>
      ) : (
        <HtmlContent
          ref={diagramReference}
          aria-label="Mermaid diagram"
          as="div"
          className={styles['forge-mermaid']}
          html={renderedDiagram.svg}
          id={diagramId}
          role="img"
          style={style}
        />
      )}
    </Fragment>
  );
}
