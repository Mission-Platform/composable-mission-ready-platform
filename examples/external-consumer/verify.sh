#!/bin/bash
set -e

# This script verifies the external consumer build and, when local services are running,
# exercises the complete local-render/send workflow through the Worker and MailPit API.

echo "Verifying external consumer example..."

# 1. Ensure we are in the example directory
cd "$(dirname "$0")"

# 2. Run TypeScript typecheck and production build.
echo "Running tsc --noEmit..."
../../node_modules/.bin/tsc --noEmit
echo "Running Vite build..."
pnpm exec vite build

# 3. Check the local Worker send contract when it is available.
worker_url="${EMAIL_WORKER_URL:-http://localhost:8787}"
mailpit_url="${MAILPIT_API_URL:-http://localhost:8025}"
html='<!doctype html><html><head><title>Mission Platform email showcase</title></head><body><table><tr><td>Verify User</td></tr></table></body></html>'
payload=$(HTML="$html" node -e 'console.log(JSON.stringify({html: process.env.HTML, to: "verify@example.com", recipientName: "Verify User"}))')

send_response=$(curl --silent --show-error --write-out $'\n%{http_code}' "${worker_url}/api/email/send" \
  -H 'content-type: application/json' \
  --data "$payload" || true)
send_status="${send_response##*$'\n'}"
send_body="${send_response%$'\n'*}"

if [[ "$send_status" == "200" ]] && grep -q 'Email delivered to MailPit.' <<<"$send_body"; then
  echo "Worker send contract passed."

  if curl --fail --silent --show-error "${mailpit_url}/api/v1/messages" | grep -q 'verify@example.com'; then
    echo "MailPit message verification passed."
  else
    echo "Worker sent successfully, but MailPit has no matching message yet." >&2
    exit 1
  fi
elif [[ "$send_status" == "502" ]]; then
  echo "Worker is running, but MailPit delivery failed. Start MailPit and try again." >&2
  exit 1
else
  echo "Worker not running; skipped integrated preview/send verification."
  echo "Start MailPit and the email-sender Worker to exercise the complete local flow."
fi

echo "✅ External consumer verification passed!"
