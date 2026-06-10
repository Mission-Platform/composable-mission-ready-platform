/**
 * Builders for `robots.txt` files.
 *
 * `robots.txt` is the original mechanism by which sites tell search-engine
 * crawlers (and other automated user-agents) which paths they may or may not
 * fetch. Modern crawlers also use it to discover the site's `Sitemap`(s).
 *
 * This module produces a deterministic string serialisation of a robots.txt
 * policy so it can be either written to disk at build time, or returned
 * dynamically by a Cloudflare Worker.
 *
 * Spec reference: https://www.rfc-editor.org/rfc/rfc9309
 */

/**
 * A single group of directives that applies to one or more user agents.
 *
 * Per RFC 9309, an empty `disallow` list is interpreted as "no restrictions"
 * for the listed user agents.
 */
export interface RobotsGroup {
  /**
   * One or more user-agent tokens this group applies to. Use `'*'` to match
   * every crawler that does not match a more specific group.
   */
  userAgent: string | string[];
  /** Paths the listed crawlers must not fetch. */
  disallow?: string[];
  /** Paths the listed crawlers may fetch (overrides a broader `disallow`). */
  allow?: string[];
  /**
   * Optional non-standard but widely supported `Crawl-delay` directive,
   * expressed in seconds.
   */
  crawlDelay?: number;
}

/** Input describing a complete `robots.txt` policy. */
export interface RobotsTxtInput {
  /**
   * One or more directive groups. If omitted, a default `User-agent: *` group
   * with no restrictions is emitted so the file is still valid.
   */
  groups?: RobotsGroup[];
  /**
   * Absolute URL(s) of `sitemap.xml` files associated with this site. Modern
   * crawlers use these to discover URLs that may not be reachable via
   * in-page links.
   */
  sitemaps?: string[];
  /**
   * Optional `Host` directive (non-standard, supported by Yandex) used to
   * indicate the preferred canonical host name when a site is reachable via
   * multiple host names.
   */
  host?: string;
  /** Optional leading comment lines (each emitted with a `# ` prefix). */
  comments?: string[];
}

/**
 * Build a deterministic `robots.txt` string from a policy description.
 *
 * The output always ends with a trailing newline so it concatenates cleanly
 * and matches the convention used by most static-site generators.
 */
export function buildRobotsTxt(input: RobotsTxtInput = {}): string {
  const lines: string[] = [];

  for (const comment of input.comments ?? []) {
    lines.push(`# ${comment}`);
  }
  if ((input.comments?.length ?? 0) > 0) {
    lines.push('');
  }

  const groups = input.groups && input.groups.length > 0 ? input.groups : [{ userAgent: '*' }];

  for (const [index, group] of groups.entries()) {
    const agents = Array.isArray(group.userAgent) ? group.userAgent : [group.userAgent];
    for (const agent of agents) {
      lines.push(`User-agent: ${agent}`);
    }
    if (!group.disallow || group.disallow.length === 0) {
      // RFC 9309: an empty Disallow means "everything is allowed".
      lines.push('Disallow:');
    } else {
      for (const path of group.disallow) {
        lines.push(`Disallow: ${path}`);
      }
    }
    for (const path of group.allow ?? []) {
      lines.push(`Allow: ${path}`);
    }
    if (typeof group.crawlDelay === 'number' && Number.isFinite(group.crawlDelay)) {
      lines.push(`Crawl-delay: ${group.crawlDelay}`);
    }
    if (index < groups.length - 1) {
      lines.push('');
    }
  }

  if (input.host) {
    lines.push('', `Host: ${input.host}`);
  }

  for (const sitemap of input.sitemaps ?? []) {
    lines.push(`Sitemap: ${sitemap}`);
  }

  return `${lines.join('\n')}\n`;
}
