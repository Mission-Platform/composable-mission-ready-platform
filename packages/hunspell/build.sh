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
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/src/wasm/"
IMAGE_TAG="mission-platform/hunspell-builder:latest"
NO_CACHE=""

if [[ "${1:-}" == "--no-cache" ]]; then
  NO_CACHE="--no-cache"
fi

# BuildKit is required for --mount=type=cache support in the Dockerfile.
export DOCKER_BUILDKIT=1

echo "Building Hunspell WASM via Docker (emscripten/emsdk)..."

docker build \
  $NO_CACHE \
  -t "$IMAGE_TAG" \
  -f "$SCRIPT_DIR/docker/Dockerfile" \
  --platform=linux/arm64 \
  --output="$DIST_DIR" \
  "$SCRIPT_DIR/docker"

echo "✓ Output written to $DIST_DIR"
