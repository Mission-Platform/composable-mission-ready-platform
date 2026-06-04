---
"@mission-platform/hunspell": patch
---

switch docker build to buildx and add github actions cache backend support

- replace `docker build` with `docker buildx build` in build.sh for multi-platform support
- add optional gha cache backend via `GHA_CACHE=1` env var or auto-detection of `GITHUB_ACTIONS=true`
- update dockerfile base image from `emscripten/emsdk:5.0.7-arm64` to the multi-platform `emscripten/emsdk:5.0.7`
- add `docker/setup-buildx-action@v4` step to the publish workflow before dependency installation
