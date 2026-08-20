import { Fragment, h, HtmlContent, type MpElement, useEffect, useId, useRef, useState } from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';
import mermaid from 'mermaid';

import { mermaidThemeCSS } from './forge-mermaid-theme';
import styles from './forge-mermaid.module.scss';

export interface ForgeMermaidProperties {
  /** Mermaid source to render. */
  code: string;
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
    <>
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
        />
      )}
    </>
  );
}
