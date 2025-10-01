#!/usr/bin/env bash
set -euo pipefail
echo '== Server preflight =='
REQ_NODE=18; NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt "$REQ_NODE" ]; then echo "Node >=18 required"; exit 1; fi
echo "Typecheck…"; npx tsc --noEmit
HEALTH=$(curl -s http://localhost:8787/api/health || true)
echo "$HEALTH" | grep -q '"ok":true' || { echo "Health check failed"; exit 1; }
# CORS check (static): ensure dev origin
if grep -Riq 'http://localhost:5173' .; then echo "CORS dev origin present"; else echo "CORS dev origin not found"; exit 1; fi
echo "npm audit (prod)…"; npm audit --production || true
echo "OK"
