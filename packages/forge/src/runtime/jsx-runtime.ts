import { h } from './h';
import {
  
  type MpChild,
  type MpElement,
  type MpElementType,
  type MpPropertyBag,
  type MpReservedProperties,
} from './types';

/**
 * Automatic JSX runtime entry point for Oxc and TypeScript. It keeps the
 * framework-neutral element shape produced by the classic `h` factory while
 * accepting the automatic transform's `props.children` and separate `key`.
 */
export function jsx(type: MpElementType, properties?: MpPropertyBag | null, key?: string | number): MpElement {
  const properties_ = key === undefined ? properties : { ...properties, key };
  return h(type, properties_);
}

/** Static JSX uses the same neutral element construction as dynamic JSX. */
export const jsxs = jsx;

/** Development transforms pass additional metadata that the neutral runtime does not need. */
export function jsxDEV(
  type: MpElementType,
  properties?: MpPropertyBag | null,
  key?: string | number,
  _isStaticChildren?: boolean,
  _source?: unknown,
  _self?: unknown,
): MpElement {
  return jsx(type, properties, key);
}



/** JSX types used when TypeScript is configured with this automatic runtime. */
export namespace JSX {
  export type Element = MpElement;
  export type IntrinsicAttributes = MpReservedProperties;

  export interface ElementChildrenAttribute {
    children: object;
  }

  export interface IntrinsicElements {
    [tagName: string]: Record<string, unknown> & {
      children?: MpChild | readonly (MpChild | readonly MpChild[])[];
    };
  }
}

export {Fragment} from './types';