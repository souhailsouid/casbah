#!/usr/bin/env bash
# Pile de développement locale : émulateurs Firestore + Auth, API en mode console, établissement et compte admin de test.
# Usage : apps/api/scripts/dev-stack.sh            (Ctrl-C pour tout arrêter)
#   puis : pnpm dev:web avec apps/web/.env.local (voir apps/web/.env.example, NEXT_PUBLIC_FIREBASE_EMULATOR=1)
#   admin de test : admin@example.com / motdepasse123
set -euo pipefail
cd "$(dirname "$0")/../../.."

export FIREBASE_PROJECT_ID=casbah-dev
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
export GCLOUD_PROJECT=casbah-dev
export CRON_SECRET=${CRON_SECRET:-dev-secret}
export WEB_URL=${WEB_URL:-http://localhost:3000,http://localhost:3210,http://127.0.0.1:3000}
export WEB_BASE_PATH=${WEB_BASE_PATH:-}
export MERCHANT_EMAIL=${MERCHANT_EMAIL:-marchand@example.com}
export PORT=${PORT:-3001}

killports() { for p in "$PORT" 8080 9099 4000; do lsof -t -i:"$p" 2>/dev/null | xargs kill 2>/dev/null || true; done; }
trap killports EXIT
killports

for j in /opt/homebrew/opt/openjdk@21/bin /opt/homebrew/opt/openjdk/bin; do [ -x "$j/java" ] && export PATH="$j:$PATH" && break; done
java -version >/dev/null 2>&1 || { echo "Java introuvable : brew install openjdk@21"; exit 1; }

echo "▶ émulateurs (UI : http://127.0.0.1:4000)"
firebase emulators:start --only firestore,auth --project casbah-dev >/tmp/casbah-dev-emu.log 2>&1 &
for i in $(seq 1 60); do curl -sf http://127.0.0.1:8080 >/dev/null 2>&1 && curl -sf http://127.0.0.1:9099 >/dev/null 2>&1 && break; sleep 1; done
curl -sf http://127.0.0.1:8080 >/dev/null 2>&1 || { echo "Émulateurs indisponibles (/tmp/casbah-dev-emu.log)"; exit 1; }

echo "▶ API sur http://127.0.0.1:$PORT (journal : /tmp/casbah-dev-api.log)"
(cd apps/api && npx tsx watch src/server.ts >/tmp/casbah-dev-api.log 2>&1) &
for i in $(seq 1 30); do curl -sf "http://127.0.0.1:$PORT/health" >/dev/null && break; sleep 1; done

echo "▶ établissement + admin de test (admin@example.com / motdepasse123)"
(cd apps/api && npx tsx scripts/seed.ts "$MERCHANT_EMAIL" >/dev/null)
(cd apps/api && npx tsx scripts/create-admin.ts admin@example.com motdepasse123 >/dev/null)

echo "✔ prêt. Ctrl-C pour arrêter."
wait
