#!/bin/bash

echo "🔍 Tempo Tracing Debug Report"
echo "======================================"
echo ""

# 1. Check if Tempo process is running
echo "1️⃣ Checking if Tempo is running..."
if pgrep -f tempo > /dev/null; then
  echo "✅ Tempo process is running"
  ps aux | grep tempo | grep -v grep
else
  echo "❌ Tempo process not found"
fi
echo ""

# 2. Check if Tempo ports are listening
echo "2️⃣ Checking Tempo ports..."
netstat -tuln 2>/dev/null | grep -E '3200|4317|4318' || ss -tuln | grep -E '3200|4317|4318'
echo ""

# 3. Test Tempo API
echo "3️⃣ Testing Tempo API (port 3200)..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3200/api/search/tags
echo ""

# 4. Test OTLP HTTP endpoint
echo "4️⃣ Testing OTLP HTTP endpoint (port 4318)..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" -X POST http://localhost:4318/v1/traces
echo ""

# 5. Test OTLP gRPC endpoint
echo "5️⃣ Testing OTLP gRPC endpoint (port 4317)..."
nc -zv localhost 4317 2>&1
echo ""

# 6. Check your app's environment
echo "6️⃣ Checking application environment..."
if [ -f .env ]; then
  echo "OTLP config from .env:"
  grep OTLP .env || echo "No OTLP variables found in .env"
else
  echo "❌ .env file not found"
fi
echo ""

# 7. Make a test request
echo "7️⃣ Making test request to app..."
response=$(curl -s -w "\nHTTP Status: %{http_code}" http://localhost:3000/api/users 2>&1)
echo "$response" | tail -n 1
echo ""

# 8. Wait for trace export
echo "8️⃣ Waiting 5 seconds for trace export..."
sleep 5
echo ""

# 9. Query Tempo for recent traces
echo "9️⃣ Querying Tempo for recent traces..."
NOW=$(date +%s)
FIVE_MIN_AGO=$((NOW - 300))

traces=$(curl -s -G "http://localhost:3200/api/search" \
  --data-urlencode "start=$FIVE_MIN_AGO" \
  --data-urlencode "end=$NOW" \
  --data-urlencode "limit=5")

if echo "$traces" | jq -e '.traces | length > 0' > /dev/null 2>&1; then
  echo "✅ Traces found in Tempo!"
  echo "$traces" | jq '.traces[] | {traceID: .traceID, rootServiceName: .rootServiceName}'
else
  echo "❌ No traces found in Tempo"
  echo "Response: $traces"
fi
echo ""

# 10. Check Tempo storage
echo "🔟 Checking Tempo storage..."
if [ -d /var/tempo/blocks ]; then
  echo "Tempo blocks directory:"
  ls -lh /var/tempo/blocks/ | head -n 10
elif [ -d ./tempo-data/blocks ]; then
  echo "Tempo blocks directory (local):"
  ls -lh ./tempo-data/blocks/ | head -n 10
else
  echo "⚠️  Tempo storage directory not found"
fi
echo ""

echo "======================================"
echo "✅ Debug report complete!"
echo ""
echo "Next steps:"
echo "1. If Tempo is not running, start it"
echo "2. If ports are not listening, check Tempo config"
echo "3. If OTLP endpoint fails, check firewall"
echo "4. Enable debug logging in your app (see tracing.js)"
