/**
 * Framework-agnostic Storybook CSF types for `@mission-platform/breakpoints`.
 *
 * Copied from `@mission-platform/storybook-framework` rather than imported —
 * the Storybook preset depends on breakpoints, so a reverse dependency would
 * create a build cycle. breakpoints keeps a direct `storybook` devDependency
 * so `storybook/internal/types` resolves without the preset package.
 */
import type { Args, ComponentAnnotations, Renderer, StoryAnnotations } from 'storybook/internal/types';

/**
 * Infer the args (props) of a neutral write-once component. A neutral component
 * is a `(properties) => MpElement` function, so its first parameter is the prop
 * bag; anything that is not such a function is treated as the args type itself.
 */
type ArgumentsOf<TComponentOrArguments> = TComponentOrArguments extends (properties: infer TProperties) => unknown
  ? TProperties
  : TComponentOrArguments;

/**
 * Framework-agnostic Storybook `Meta` for write-once neutral stories. Accepts
 * either a neutral component (`Meta<typeof MyComponent>`) or an explicit args
 * type (`Meta<MyComponentProps>`), mirroring the renderer `Meta` ergonomics.
 */
export type Meta<TComponentOrArguments = Args> = ComponentAnnotations<Renderer, ArgumentsOf<TComponentOrArguments>>;

/**
 * Framework-agnostic Storybook `StoryObj`, the neutral counterpart to
 * {@link Meta}. Accepts either `typeof meta` (reusing its args) or an explicit
 * args/component type.
 */
// `StoryObj` is the canonical Storybook CSF type name that consumers expect, so
// keep the abbreviation rather than renaming it to `StoryObject`.
export type StoryObj<TMetaOrComponentOrArgs = Args> =
  TMetaOrComponentOrArgs extends ComponentAnnotations<Renderer, infer TArguments>
    ? StoryAnnotations<Renderer, TArguments>
    : StoryAnnotations<Renderer, ArgumentsOf<TMetaOrComponentOrArgs>>;
