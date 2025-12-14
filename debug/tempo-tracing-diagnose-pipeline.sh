#!/bin/bash
set -u -o pipefail

echo "🔍 Tempo Tracing Debug Report"
echo "======================================"
echo ""

# 1. Check if Tempo process is running (host) OR container is running
echo "1️⃣ Checking if Tempo is running..."
if pgrep -f tempo > /dev/null 2>&1; then
  echo "✅ Tempo process is running (host)"
  ps aux | grep tempo | grep -v grep
else
  echo "⚠️ Tempo process not found on host (may be running in Docker)"
  if command -v docker >/dev/null 2>&1; then
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}" | grep -i tempo || true
  fi
fi
echo ""

# 2. Check if Tempo ports are listening
echo "2️⃣ Checking Tempo ports (3200, 4317, 4318)..."
(netstat -tuln 2>/dev/null || true) | grep -E '(:3200|:4317|:4318)\b' \
  || (ss -tuln 2>/dev/null || true) | grep -E '(:3200|:4317|:4318)\b' \
  || echo "⚠️ netstat/ss not available or no listeners shown"
echo ""

# 3. Test Tempo API
echo "3️⃣ Testing Tempo API (port 3200)..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3200/api/search/tags
echo ""

# 4. Check OTLP ports reachability (more reliable than POSTing empty /v1/traces)
echo "4️⃣ Checking OTLP ports reachability..."
if command -v nc >/dev/null 2>&1; then
  nc -zv localhost 4318 2>&1 || true
  nc -zv localhost 4317 2>&1 || true
else
  echo "⚠️ nc not installed; skipping TCP reachability checks"
fi
echo ""

# 5. Check your app's environment
echo "5️⃣ Checking application environment..."
if [ -f .env ]; then
  echo "OTLP config from .env:"
  grep -E 'OTLP|OTEL' .env || echo "No OTLP/OTEL variables found in .env"
else
  echo "❌ .env file not found"
fi
echo ""

# 6. Make a test request to app
echo "6️⃣ Making test request to app..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000/api/users
echo ""

# 7. Wait for trace export
echo "7️⃣ Waiting 5 seconds for trace export..."
sleep 5
echo ""

# 8. Query Tempo for recent traces
echo "8️⃣ Querying Tempo for recent traces..."
NOW=$(date +%s)
FIVE_MIN_AGO=$((NOW - 300))

traces=$(curl -s -G "http://localhost:3200/api/search" \
  --data-urlencode "start=$FIVE_MIN_AGO" \
  --data-urlencode "end=$NOW" \
  --data-urlencode "limit=5")

if command -v jq >/dev/null 2>&1; then
  if echo "$traces" | jq -e '.traces | length > 0' >/dev/null 2>&1; then
    echo "✅ Traces found in Tempo!"
    echo "$traces" | jq '.traces[] | {traceID: .traceID, rootServiceName: .rootServiceName}'
  else
    echo "❌ No traces found in Tempo"
    echo "Response:"
    echo "$traces" | jq .
  fi
else
  echo "⚠️ jq not installed; raw response:"
  echo "$traces"
fi
echo ""

# 9. Check common Tempo storage paths (varies by deployment)
echo "9️⃣ Checking Tempo storage (common paths)..."
for p in /var/tempo/blocks ./tempo-data/blocks /tmp/tempo /tmp/tempo/traces; do
  if [ -d "$p" ]; then
    echo "Found: $p"
    ls -lh "$p" | head -n 10
  fi
done
echo ""

echo "======================================"
echo "✅ Debug report complete!"
