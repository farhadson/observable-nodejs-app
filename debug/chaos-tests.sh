#!/usr/bin/env bash
set -u -o pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

# Helpers
hr() { echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; }
title() { hr; echo "📍 $1"; hr; }
req_ok() { curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" "$@"; }
json() { jq -C . 2>/dev/null || cat; }

cleanup() {
  echo
  echo "🧹 Cleanup: disabling all chaos..."
  curl -s -X POST "$BASE_URL/api/chaos/disable-all" | json
  echo "✅ Cleanup done"
}
trap cleanup EXIT

echo "🔥 Starting Chaos Engineering Tests"
echo "BASE_URL=$BASE_URL"
echo

title "0) Baseline (no chaos) — quick smoke"
curl -s "$BASE_URL/api/chaos/disable-all" | json
echo "Health:"; req_ok "$BASE_URL/health"
echo "Users:";  req_ok "$BASE_URL/api/users"
echo

title "1) Status endpoint"
curl -s "$BASE_URL/api/chaos/status" | json
echo

title "2) Latency injection (database = 500ms)"
curl -s -X POST "$BASE_URL/api/chaos/latency" \
  -H "Content-Type: application/json" \
  -d '{"service":"database","duration":500,"enabled":true}' | json

echo "Hit /api/users 5 times (expect slower):"
for i in {1..5}; do
  printf "Attempt %s: " "$i"
  req_ok "$BASE_URL/api/users"
done
echo

title "3) Random failures (database probability = 0.3)"
curl -s -X POST "$BASE_URL/api/chaos/random-failure" \
  -H "Content-Type: application/json" \
  -d '{"service":"database","probability":0.3,"enabled":true}' | json

echo "Hit /api/users 15 times (expect some failures):"
success=0; fail=0
for i in {1..15}; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/users")
  if [ "$code" = "200" ]; then
    success=$((success+1))
    echo "Attempt $i: ✅ 200"
  else
    fail=$((fail+1))
    echo "Attempt $i: ❌ $code"
  fi
done
echo "Results: success=$success fail=$fail"
echo

title "4) CPU spike (5s) then check responsiveness"
curl -s -X POST "$BASE_URL/api/chaos/cpu-spike" \
  -H "Content-Type: application/json" \
  -d '{"duration":5000}' | json

echo "Immediately request /health and /api/users:"
echo "Health:"; req_ok "$BASE_URL/health"
echo "Users:";  req_ok "$BASE_URL/api/users"
echo

title "5) Memory leak simulation (15s) then basic check"
curl -s -X POST "$BASE_URL/api/chaos/memory-leak" \
  -H "Content-Type: application/json" \
  -d '{"duration":15000}' | json

echo "Health:"; req_ok "$BASE_URL/health"
echo

title "6) Simulated database error (TIMEOUT) + request"
curl -s -X POST "$BASE_URL/api/chaos/database-error" \
  -H "Content-Type: application/json" \
  -d '{"errorType":"TIMEOUT"}' | json

echo "Users (expect error):"
curl -s -i "$BASE_URL/api/users" | tail -n 12
echo

title "7) Circuit breaker test endpoint"
curl -s -i -X POST "$BASE_URL/api/chaos/circuit-breaker-test" | head -n 30
echo

title "8) Combined: latency(200ms) + random failures(0.1) under light pressure"
curl -s -X POST "$BASE_URL/api/chaos/latency" \
  -H "Content-Type: application/json" \
  -d '{"service":"database","duration":200,"enabled":true}' > /dev/null

curl -s -X POST "$BASE_URL/api/chaos/random-failure" \
  -H "Content-Type: application/json" \
  -d '{"service":"database","probability":0.1,"enabled":true}' > /dev/null

echo "20 requests to /api/users:"
for i in {1..20}; do
  printf "Attempt %s: " "$i"
  req_ok "$BASE_URL/api/users"
done

echo
echo "🏁 Done. Cleanup will run automatically."
