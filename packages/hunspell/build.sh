#!/usr/bin/env bash
# Compile Hunspell to WebAssembly using Emscripten inside a Docker container.
# Output: packages/hunspell/src/wasm/ (hunspell.js + hunspell.wasm + hunspell.d.ts)
#
# Usage: ./build.sh [--no-cache]
#
# Caching behaviour
# ─────────────────
# BuildKit cache mounts are used for:
#   • apt package lists  (/var/cache/apt, /var/lib/apt)
#   • downloaded source tarballs (/root/.wget-cache)
#   • npm global package cache (/root/.npm)
#   • ccache compiler cache (/root/.ccache)
#
# These caches are stored on the host by BuildKit and reused automatically on
# subsequent runs.  Pass --no-cache to skip all layer and compiler caches.
#
# GitHub Actions caching
# ──────────────────────
# When this script runs inside a GitHub Actions workflow (GITHUB_ACTIONS=true),
# the docker/build-push-action already manages the GHA cache backend via
# cache-from / cache-to flags.  If you invoke build.sh directly from a workflow
# step instead, set GHA_CACHE=1 to enable the equivalent flags here:
#
#   GHA_CACHE=1 bash build.sh
#
# This passes --cache-from type=gha,scope=hunspell-wasm and
# --cache-to type=gha,scope=hunspell-wasm,mode=max to `docker buildx build`,
# which requires the Buildx driver (docker/setup-buildx-action).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/src/wasm/"
IMAGE_TAG="mission-platform/hunspell-builder:latest"
NO_CACHE=""
GHA_CACHE_FLAGS=""

if [[ "${1:-}" == "--no-cache" ]]; then
  NO_CACHE="--no-cache"
fi

# Enable the GitHub Actions cache backend when explicitly requested or when we
# detect the GHA environment.  The GHA cache backend requires `docker buildx`
# (not plain `docker build`) and the Buildx driver to be initialised first via
# the docker/setup-buildx-action workflow step.
if [[ "${GHA_CACHE:-}" == "1" || "${GITHUB_ACTIONS:-}" == "true" ]]; then
  GHA_CACHE_FLAGS="--cache-from type=gha,scope=hunspell-wasm --cache-to type=gha,scope=hunspell-wasm,mode=max"
  echo "GitHub Actions cache backend enabled (scope: hunspell-wasm)"
fi

# BuildKit is required for --mount=type=cache support in the Dockerfile.
export DOCKER_BUILDKIT=1

echo "Building Hunspell WASM via Docker (emscripten/emsdk)..."

# shellcheck disable=SC2086  # word-splitting on flag variables is intentional
docker buildx build \
  $NO_CACHE \
  $GHA_CACHE_FLAGS \
  -t "$IMAGE_TAG" \
  -f "$SCRIPT_DIR/docker/Dockerfile" \
  --platform=linux/arm64 \
  --output="$DIST_DIR" \
  "$SCRIPT_DIR/docker"

echo "✓ Output written to $DIST_DIR"
