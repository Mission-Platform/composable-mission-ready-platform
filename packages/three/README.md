# @mission-platform/three

Framework-neutral Three.js integration for Mission Platform. Authored once against `@mission-platform/forge` and
compiled to Vue 3 and React 18/19.

## Components

- `ForgeThreeCanvas` — Renders a `<canvas>` and manages a Three.js `WebGLRenderer`, `Scene`, and `PerspectiveCamera`.
  Exposes an `onReady` callback to interact with the Three.js context.

## Hooks

- `useThree(canvasRef, onReady?)` — The underlying hook used by `ForgeThreeCanvas` to manage the Three.js lifecycle.

## SSR Safety

The Three.js context and render loop are only initialised in the browser. On the server, the component renders an empty
`<canvas>` and the hook no-ops.

## Cleanup

The `WebGLRenderer` is disposed and the animation frame is cancelled when the component is unmounted.
