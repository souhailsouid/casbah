#!/usr/bin/env bash
# Test de bout en bout en local : émulateurs Firestore + Auth, API en mode console (aucun envoi réel).
# Scénario : disponibilités → demande de réservation → compte admin → pile → confirmation → annulation par lien → cron.
# Usage : apps/api/scripts/smoke.sh   (depuis la racine du dépôt, après `pnpm install && pnpm build:shared`)
set -euo pipefail
cd "$(dirname "$0")/../../.."

export FIREBASE_PROJECT_ID=casbah-dev
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
export GCLOUD_PROJECT=casbah-dev
export CRON_SECRET=smoke-secret
export WEB_URL=http://localhost:3000
export WEB_BASE_PATH=
export MERCHANT_EMAIL=marchand@example.com
export PORT=3210
export NODE_ENV=test
API=http://127.0.0.1:$PORT
LOG=/tmp/casbah-smoke-api.log

# Tue l'API et les émulateurs par port (les PID des sous-shells ne suffisent pas : npx/tsx/java sont des enfants).
killports() { for p in "$PORT" 8080 9099 4000; do lsof -t -i:"$p" 2>/dev/null | xargs kill 2>/dev/null || true; done; }
cleanup() { killports; }
trap cleanup EXIT
killports

# Java est requis par les émulateurs (brew install openjdk@21)
for j in /opt/homebrew/opt/openjdk@21/bin /opt/homebrew/opt/openjdk/bin; do [ -x "$j/java" ] && export PATH="$j:$PATH" && break; done
java -version >/dev/null 2>&1 || { echo "Java introuvable : brew install openjdk@21"; exit 1; }

echo "▶ émulateurs"
firebase emulators:start --only firestore,auth --project casbah-dev >/tmp/casbah-smoke-emu.log 2>&1 &
EMU_PID=$!
for i in $(seq 1 60); do curl -sf "http://127.0.0.1:8080" >/dev/null 2>&1 && curl -sf "http://127.0.0.1:9099" >/dev/null 2>&1 && break; sleep 1; done
curl -sf "http://127.0.0.1:8080" >/dev/null 2>&1 || { echo "Émulateurs indisponibles (voir /tmp/casbah-smoke-emu.log)"; exit 1; }

echo "▶ API"
(cd apps/api && npx tsx src/server.ts >"$LOG" 2>&1) &
API_PID=$!
for i in $(seq 1 30); do curl -sf "$API/health" >/dev/null && break; sleep 1; done
curl -sf "$API/health"; echo

echo "▶ établissement + admin"
(cd apps/api && npx tsx scripts/seed.ts marchand@example.com >/dev/null)
(cd apps/api && npx tsx scripts/create-admin.ts admin@example.com motdepasse123 >/dev/null)

echo "▶ disponibilités hommes"
AVAIL=$(curl -sf "$API/availability?espace=hommes&days=7")
# Créneau à J+2 au moins : l'annulation client n'est autorisée que 24 h avant.
DATE=$(echo "$AVAIL" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);const d=j.days.slice(2).find(x=>x.slots.length);console.log(d.date+" "+d.slots[0].hour)})')
D=${DATE% *}; H=${DATE#* }
echo "   créneau choisi : $D ${H}h"

echo "▶ demande de réservation"
KEY=$(node -e 'console.log(crypto.randomUUID())')
RES=$(curl -sf -X POST "$API/reservations" -H 'Content-Type: application/json' -d "{
  \"forfait\":\"rituel\",\"espace\":\"hommes\",\"persons\":2,\"date\":\"$D\",\"hour\":$H,
  \"customer\":{\"name\":\"Test Client\",\"phone\":\"+33612345678\",\"email\":\"client@example.com\",\"whatsappOptIn\":true,\"locale\":\"fr\"},
  \"idempotencyKey\":\"$KEY\"}")
echo "   $RES"
ID=$(echo "$RES" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).id))')

echo "▶ idempotence (même clé → 200, même id)"
curl -s -o /dev/null -w "   HTTP %{http_code}\n" -X POST "$API/reservations" -H 'Content-Type: application/json' -d "{
  \"forfait\":\"rituel\",\"espace\":\"hommes\",\"persons\":2,\"date\":\"$D\",\"hour\":$H,
  \"customer\":{\"name\":\"Test Client\",\"phone\":\"+33612345678\",\"whatsappOptIn\":true,\"locale\":\"fr\"},\"idempotencyKey\":\"$KEY\"}"

echo "▶ doublon (autre clé, même téléphone/créneau → 409)"
curl -s -o /dev/null -w "   HTTP %{http_code}\n" -X POST "$API/reservations" -H 'Content-Type: application/json' -d "{
  \"forfait\":\"rituel\",\"espace\":\"hommes\",\"persons\":2,\"date\":\"$D\",\"hour\":$H,
  \"customer\":{\"name\":\"Test Client\",\"phone\":\"+33612345678\",\"whatsappOptIn\":true,\"locale\":\"fr\"},\"idempotencyKey\":\"$(node -e 'console.log(crypto.randomUUID())')\"}"

echo "▶ capacité décrémentée"
curl -sf "$API/availability?espace=hommes&days=7" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);const d=j.days.find(x=>x.date==='$D');console.log('   restant à ${H}h :', d.slots.find(x=>x.hour===$H).remaining)})"

echo "▶ token admin (émulateur Auth)"
TOKEN=$(curl -sf -X POST "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake" -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"motdepasse123","returnSecureToken":true}' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).idToken))')
AUTH="Authorization: Bearer $TOKEN"

echo "▶ sans token → 401"
curl -s -o /dev/null -w "   HTTP %{http_code}\n" "$API/admin/inbox"

echo "▶ pile admin"
curl -sf "$API/admin/inbox" -H "$AUTH" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log("   en attente :",j.pending.length,"· à venir :",j.upcoming.length)})'

echo "▶ confirmation"
curl -sf -X POST "$API/admin/reservations/$ID/confirm" -H "$AUTH" -H 'Content-Type: application/json' -d '{}' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log("   statut :",JSON.parse(s).reservation.status))'
sleep 1

echo "▶ journal des notifications"
curl -sf "$API/admin/reservations/$ID" -H "$AUTH" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for(const n of JSON.parse(s).notifications)console.log("   ",n.event,n.channel,n.audience,"→",n.status)})'

echo "▶ annulation par lien (jeton extrait du message console)"
TOKEN_CANCEL=$(grep -o 'annulation?id=[A-Za-z0-9]*&token=[A-Za-z0-9_-]*' "$LOG" | head -1 | sed 's/.*token=//')
curl -sf "$API/reservations/$ID/cancel/$TOKEN_CANCEL" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log("   résumé :",j.name,j.date,j.hour+"h",j.canCancel?"annulable":"non annulable")})'
curl -sf -X POST "$API/reservations/$ID/cancel/$TOKEN_CANCEL" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log("   statut :",JSON.parse(s).status))'

echo "▶ crons"
curl -s -o /dev/null -w "   sans secret → HTTP %{http_code}\n" -X POST "$API/cron/reminders"
curl -sf -X POST "$API/cron/reminders" -H "x-cron-secret: $CRON_SECRET"; echo
curl -sf -X POST "$API/cron/complete-past" -H "x-cron-secret: $CRON_SECRET"; echo
curl -sf -X POST "$API/cron/retry-notifications" -H "x-cron-secret: $CRON_SECRET"; echo

echo "▶ webhook WhatsApp sans signature → 401"
curl -s -o /dev/null -w "   HTTP %{http_code}\n" -X POST "$API/webhooks/whatsapp" -H 'Content-Type: application/json' -d '{}'

echo "✔ scénario terminé (journal API : $LOG)"
