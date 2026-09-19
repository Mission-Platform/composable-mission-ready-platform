/* eslint-disable @typescript-eslint/no-unconstrained-generics */
import { applySecurityHeaders } from './headers';

import type { SecurityHeaderOptions } from './types';

export type FetchHandler<Env extends unknown = unknown> = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
) => Promise<Response> | Response;

export interface ExportedHandlerLike<Env extends unknown = unknown> {
  readonly fetch?: FetchHandler<Env>;
  readonly [key: string]: unknown;
}

export type SecurityOptionsProvider<Env extends unknown = unknown> =
  SecurityHeaderOptions | ((request: Request, env: Env) => SecurityHeaderOptions | Promise<SecurityHeaderOptions>);

/**
 * Wraps a fetch handler with automatic security header injection.
 *
 * @param handlerOrObject - A fetch handler function.
 * @param optionsOrProvider - Static security options or a dynamic options provider function.
 * @returns The wrapped fetch handler function.
 */
export function withSecurityHeaders<Env extends unknown = unknown>(
  handlerOrObject: FetchHandler<Env>,
  optionsOrProvider?: SecurityOptionsProvider<Env>,
): FetchHandler<Env>;
/**
 * Wraps an ExportedHandler object with automatic security header injection on its fetch method.
 *
 * @param handlerOrObject - A Cloudflare Worker exported handler object containing a fetch method.
 * @param optionsOrProvider - Static security options or a dynamic options provider function.
 * @returns The wrapped exported handler object.
 */
export function withSecurityHeaders<
  Env extends unknown = unknown,
  T extends ExportedHandlerLike<Env> = ExportedHandlerLike<Env>,
>(handlerOrObject: T, optionsOrProvider?: SecurityOptionsProvider<Env>): T;
/**
 * Implementation of withSecurityHeaders supporting both handler functions and worker objects.
 *
 * @param handlerOrObject - A fetch handler function or exported handler object.
 * @param optionsOrProvider - Static security options or dynamic options provider.
 * @returns The wrapped handler or worker object.
 */
export function withSecurityHeaders<Env extends unknown = unknown>(
  handlerOrObject: FetchHandler<Env> | ExportedHandlerLike<Env>,
  optionsOrProvider?: SecurityOptionsProvider<Env>,
): FetchHandler<Env> | ExportedHandlerLike<Env> {
  if (typeof handlerOrObject === 'function') {
    return async function securityFetchHandler(
      request: Request,
      environment: Env,
      context: ExecutionContext,
    ): Promise<Response> {
      const options =
        typeof optionsOrProvider === 'function' ? await optionsOrProvider(request, environment) : optionsOrProvider;

      try {
        const response = await handlerOrObject(request, environment, context);
        return applySecurityHeaders(response, options);
      } catch (error) {
        if (options?.catchErrors) {
          const fallback = Response.json(
            { ok: false, error: 'Internal Server Error' },
            {
              status: 500,
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
            },
          );
          return applySecurityHeaders(fallback, options);
        }
        throw error;
      }
    };
  }

  if (typeof handlerOrObject === 'object' && handlerOrObject !== null && typeof handlerOrObject.fetch === 'function') {
    const originalFetch = handlerOrObject.fetch.bind(handlerOrObject);
    const wrappedFetch = withSecurityHeaders(originalFetch, optionsOrProvider);
    return {
      ...handlerOrObject,
      fetch: wrappedFetch,
    };
  }

  throw new TypeError('withSecurityHeaders requires a fetch function or an object with a fetch method');
}
