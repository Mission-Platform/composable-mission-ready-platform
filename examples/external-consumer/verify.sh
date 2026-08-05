#!/bin/bash
set -e

# This script documents and verifies the external consumer setup.
# It uses the workspace resolution to simulate an external install.

echo "Verifying external consumer example..."

# 1. Ensure we are in the example directory
cd "$(dirname "$0")"

# 2. Run TypeScript typecheck
# Since it's not a workspace member, we rely on pnpm having linked the 'workspace:*' deps
# during the root 'pnpm install'.
echo "Running tsc --noEmit..."
../../node_modules/.bin/tsc --noEmit

echo "✅ Typecheck passed!"
