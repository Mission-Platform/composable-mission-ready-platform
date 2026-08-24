/**
 * Framework-agnostic Storybook CSF types for the Mission Platform write-once
 * ecosystem.
 *
 * A single neutral `*.stories.tsx` is authored **once** and compiled to every
 * framework at Storybook build time (the `STORYBOOK_FRAMEWORK` env var selects
 * the renderer and its JSX transform, while the bare `@mission-platform/<pkg>`
 * import auto-resolves to the matching framework build). Inside a package the
 * same story is type-checked under the neutral forge JSX toolchain
 * (`jsx: react-jsx`, `jsxImportSource: '@mission-platform/forge'`), where a
 * component is a plain `(properties) => MpElement` function rather than a
 * Vue/React node.
 *
 * A renderer-specific `Meta`/`StoryObj` (e.g. from `@storybook/react-vite`)
 * therefore can't be used — it is bound to that renderer's component/node
 * shape. These aliases bind to the base {@link Renderer} instead (whose
 * `storyResult` is `unknown`) while preserving the exact ergonomics of the
 * renderer types, so existing per-framework stories convert to a single neutral
 * story with only their import lines changed:
 *
 * - `satisfies Meta<typeof MyComponent>` — infers args from a neutral component.
 * - `satisfies Meta<MyComponentProps>` — args given explicitly.
 * - `StoryObj<typeof meta>` — reuses the args of the `meta` above.
 * - `StoryObj<MyComponentProps>` — args given explicitly.
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
// eslint-disable-next-line unicorn/prevent-abbreviations
export type StoryObj<TMetaOrComponentOrArgs = Args> =
  TMetaOrComponentOrArgs extends ComponentAnnotations<Renderer, infer TArguments>
    ? StoryAnnotations<Renderer, TArguments>
    : StoryAnnotations<Renderer, ArgumentsOf<TMetaOrComponentOrArgs>>;
