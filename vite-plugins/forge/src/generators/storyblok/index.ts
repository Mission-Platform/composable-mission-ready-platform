/**
 * Storyblok emitter for the two-stage compiler.
 *
 * Alongside the React and Vue targets, a neutral component authored against
 * `@mission-platform/forge` can be projected onto **Storyblok**: a blok
 * configuration (a Storyblok *component object*) plus a thin framework blok
 * wrapper. Unlike the React/Vue emitters this never rewrites the component body
 * — it only needs the props *contract*. The work is split across:
 *
 * - `types.ts` — the Storyblok component/field/analysis types,
 * - `names.ts` — the technical/display name derivation,
 * - `classify.ts` — the prop-type → Storyblok field classification,
 * - `analyze.ts` — the schema analysis ({@link analyzeStoryblokComponent}), and
 * - `wrappers.ts` — the React/Vue blok-wrapper emitters.
 */
export { analyzeStoryblokComponent, emitStoryblokComponent } from './analyze.js';
export { toDisplayName, toTechnicalName } from './names.js';
export { emitBlokDataType, emitStoryblokBlokWrapper, type StoryblokBlokWrapperOptions } from './wrappers.js';
export type {
  AnalyzedField,
  AnalyzedStoryblokComponent,
  StoryblokComponent,
  StoryblokComponentNames,
  StoryblokSchemaField,
} from './types.js';
