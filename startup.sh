#!/bin/sh
set -eu
if [ -d /workspace ]; then
  cd /workspace
else
  cd "$(dirname "$0")"
fi
node scripts/preview.mjs stop || true
if curl --noproxy "*" -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
