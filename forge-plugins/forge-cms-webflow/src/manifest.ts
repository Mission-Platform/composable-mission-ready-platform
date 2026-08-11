/**
 * The `webflow.json` library fragment.
 *
 * Webflow discovers Code Components by *globbing built JavaScript*, not by
 * reading a list of source files: the CLI loads every module the
 * `library.components` patterns match and registers whatever `declareComponent`
 * calls it finds. The manifest is therefore emitted as an asset next to the
 * bundled output and its single glob points at the built declarations —
 * `dist/cms/webflow/react/*.webflow.js` — rather than at the `.webflow.tsx`
 * sources the driver wrote into its cache.
 *
 * The fragment is deliberately *only* the `library` block. A site's own
 * `webflow.json` carries workspace and site ids that a component library has no
 * business inventing, so the consumer merges this block into theirs.
 */

/** The file the library fragment is written to. */
export const WEBFLOW_LIBRARY_MANIFEST = "webflow.json";

/** The library name used when the caller does not supply one. */
export const DEFAULT_WEBFLOW_LIBRARY_NAME = "Forge";

/** The `library` block of a Webflow Code Components manifest. */
export interface WebflowLibrary {
  /** The library name shown in the Designer. */
  readonly name: string;
  /** Globs, relative to the package `dist` root, of the built declarations. */
  readonly components: readonly string[];
}

/** The `webflow.json` fragment a consuming site merges into its own manifest. */
export interface WebflowManifest {
  readonly library: WebflowLibrary;
}

/**
 * The glob that matches every built declaration of one target run.
 *
 * `asset: true` artifacts are mirrored to `dist/cms/<cmsId>/`, while the
 * compiled modules stay in `dist/cms/<cmsId>/<frameworkId>/`, so the pattern is
 * written relative to the package `dist` root and is valid from wherever the
 * consumer merges it.
 */
export function webflowComponentsGlob(frameworkId: string): string {
  return `./cms/webflow/${frameworkId}/*.webflow.js`;
}

/** Build the `webflow.json` fragment for a library. */
export function buildWebflowManifest(
  libraryName: string,
  frameworkId: string,
): WebflowManifest {
  return {
    library: {
      name: libraryName,
      components: [webflowComponentsGlob(frameworkId)],
    },
  };
}

/**
 * Emit `webflow.json`.
 *
 * The components are deliberately not enumerated: Webflow resolves the glob
 * itself, so the manifest stays identical whether a library ships one component
 * or a hundred and can never drift out of sync with the emitted tree.
 */
export function emitWebflowManifest(
  libraryName: string,
  frameworkId: string,
): string {
  return `${JSON.stringify(buildWebflowManifest(libraryName, frameworkId), undefined, 2)}\n`;
}
