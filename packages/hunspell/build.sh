#!/usr/bin/env bash
# Compile Hunspell to WebAssembly using Emscripten inside a Docker container.
# Output: packages/hunspell/dist/hunspell.js (WASM inlined as base64)
#
# Usage: ./build.sh [--no-cache]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/src/wasm/"
IMAGE_TAG="mission-platform/hunspell-builder:latest"
NO_CACHE=""

if [[ "${1:-}" == "--no-cache" ]]; then
  NO_CACHE="--no-cache"
fi

echo "Building Hunspell WASM via Docker (emscripten/emsdk)..."

docker --debug build \
  $NO_CACHE \
  -t "$IMAGE_TAG" \
  -f "$SCRIPT_DIR/docker/Dockerfile" \
  --platform=linux/arm64 \
  --output=$DIST_DIR \
  "$SCRIPT_DIR/docker"

echo "✓ Output written to $DIST_DIR/hunspell.js"
