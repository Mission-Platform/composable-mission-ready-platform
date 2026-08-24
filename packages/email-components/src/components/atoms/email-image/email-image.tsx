import { validateUrl } from '@mission-platform/email-renderer';
import { type MpChild, type MpElement } from '@mission-platform/forge';

export interface EmailImageProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  readonly src: string;
  readonly alt: string;
  readonly width?: number;
  readonly height?: number;
  readonly fluid?: boolean;
}

export function EmailImage(properties: Readonly<EmailImageProperties>): MpElement {
  if (properties.alt.trim().length === 0) {
    throw new Error('EmailImage requires non-empty alt text.');
  }
  const style = {
    display: 'block',
    height: properties.height ? `${properties.height}px` : 'auto',
    maxWidth: properties.fluid ? '100%' : undefined,
    width: properties.width ? `${properties.width}px` : undefined,
  };
  return (
    <img
      src={validateUrl(properties.src, 'src')}
      alt={properties.alt}
      width={properties.width}
      height={properties.height}
      style={style}
    />
  );
}
