/**
 * Content Security Policy directive mappings.
 * Supports string arrays of allowed sources or booleans for flag directives.
 */
export interface CspDirectives {
  readonly defaultSrc?: readonly string[];
  readonly scriptSrc?: readonly string[];
  readonly scriptSrcElem?: readonly string[];
  readonly scriptSrcAttr?: readonly string[];
  readonly styleSrc?: readonly string[];
  readonly styleSrcElem?: readonly string[];
  readonly styleSrcAttr?: readonly string[];
  readonly imgSrc?: readonly string[];
  readonly connectSrc?: readonly string[];
  readonly fontSrc?: readonly string[];
  readonly objectSrc?: readonly string[];
  readonly mediaSrc?: readonly string[];
  readonly frameSrc?: readonly string[];
  readonly childSrc?: readonly string[];
  readonly workerSrc?: readonly string[];
  readonly manifestSrc?: readonly string[];
  readonly baseUri?: readonly string[];
  readonly formAction?: readonly string[];
  readonly frameAncestors?: readonly string[];
  readonly upgradeInsecureRequests?: boolean;
  readonly blockAllMixedContent?: boolean;
}

export interface HstsOptions {
  /** max-age in seconds (default: 31536000 - 1 year) */
  readonly maxAge?: number;
  /** Whether to include subdomains (default: true) */
  readonly includeSubDomains?: boolean;
  /** Whether to request preload list inclusion (default: true) */
  readonly preload?: boolean;
}

export type FrameOptions = 'DENY' | 'SAMEORIGIN';

export type ReferrerPolicy =
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

export type PermissionsPolicyDirectives = Record<string, readonly string[]>;

export interface SecurityHeaderOptions {
  /**
   * Content Security Policy configuration.
   * - true / omitted: uses DEFAULT_CSP_DIRECTIVES.
   * - false: omits CSP header.
   * - CspDirectives object: merged with DEFAULT_CSP_DIRECTIVES.
   */
  readonly csp?: boolean | CspDirectives;

  /**
   * HTTP Strict Transport Security configuration.
   * - true / omitted: uses DEFAULT_HSTS_OPTIONS.
   * - false: omits HSTS header.
   * - HstsOptions: custom max-age, includeSubDomains, preload.
   */
  readonly hsts?: boolean | HstsOptions;

  /**
   * X-Frame-Options value.
   * Defaults to 'DENY'. Set false to omit.
   */
  readonly frameOptions?: FrameOptions | false;

  /**
   * X-Content-Type-Options: nosniff.
   * Defaults to true ('nosniff'). Set false to omit.
   */
  readonly contentTypeOptions?: boolean;

  /**
   * Referrer-Policy value.
   * Defaults to 'strict-origin-when-cross-origin'. Set false to omit.
   */
  readonly referrerPolicy?: ReferrerPolicy | false;

  /**
   * Permissions-Policy directives.
   * Map of feature names to allowed origins (e.g. { camera: [], geolocation: ['self'] }).
   */
  readonly permissionsPolicy?: PermissionsPolicyDirectives | false;

  /**
   * X-XSS-Protection.
   * Defaults to '0' per modern OWASP recommendations. Set false to omit.
   */
  readonly xssProtection?: string | false;

  /**
   * Cross-Origin-Opener-Policy (COOP).
   * Set false or omit to exclude.
   */
  readonly crossOriginOpenerPolicy?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none' | false;

  /**
   * Cross-Origin-Resource-Policy (CORP).
   * Set false or omit to exclude.
   */
  readonly crossOriginResourcePolicy?: 'same-origin' | 'same-site' | 'cross-origin' | false;

  /**
   * Whether to catch unhandled exceptions in the handler and return a 500 response
   * with security headers applied. Defaults to false (propagates exception).
   */
  readonly catchErrors?: boolean;
}
