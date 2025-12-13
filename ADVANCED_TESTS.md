## 📚 **TESTING TYPES OVERVIEW**

| Test Type | What You Did | Example |
|-----------|--------------|---------|
| **Functional Testing** | ✅ Testing if features work as expected | Create user → User created |
| **Integration Testing** | ✅ Testing multiple components together | API → Service → Database |
| **API Testing** | ✅ Testing HTTP endpoints | All your curl commands |
| **Error Handling Testing** | ✅ Testing error scenarios | Duplicate email, 404, validation |
| **Happy Path Testing** | ✅ Testing normal user flows | Register → Login → Get user |
| **Negative Testing** | ✅ Testing with invalid inputs | Wrong password, missing fields |

**Is it conformance testing?** Partially! Conformance testing verifies your API follows a specification (like OpenAPI/Swagger). You're doing **functional** and **integration** testing.

***

## 🎯 **TESTING PYRAMID**

```
                    /\
                   /  \
                  / E2E \          ← End-to-End (Browser/UI tests)
                 /______\
                /        \
               / Integration\      ← What you're doing now
              /____________\
             /              \
            /  Unit Tests    \    ← Individual functions
           /__________________\
```

**Level 2: Integration/API Testing** ✅

***

## 💥 **CHAOS TESTING vs PRESSURE TESTING**

### **1. Pressure Testing (Load/Stress Testing)**

**Goal:** See how your system handles **heavy load**

**Questions it answers:**
- How many requests per second can my API handle?
- When does my database start slowing down?
- At what point does my server crash?

**Example:**
```bash
# Send 1000 requests with 50 concurrent users
ab -n 1000 -c 50 http://localhost:3000/api/users
```

**Analogy:** 
- Regular day: 10 cars on a bridge ✅
- Pressure test: 10,000 cars on the bridge 🚗🚗🚗
- Question: Does the bridge collapse?

***

### **2. Chaos Testing (Chaos Engineering)**

**Goal:** See how your system handles **random failures**

**Questions it answers:**
- What happens if the database goes down?
- What happens if network is slow (500ms delay)?
- What happens if memory is full?
- Does my app crash or recover gracefully?

**Example:**
```bash
# Simulate database failure
curl -X POST http://localhost:3000/api/chaos/database-error

# Simulate slow network (500ms delay)
curl -X POST http://localhost:3000/api/chaos/latency \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"delayMs":500}'
```

**Analogy:**
- Regular day: Bridge works fine ✅
- Chaos test: What if a cable snaps? 💥
- Question: Does the bridge collapse or stay up with 1 cable missing?

***

## 📊 **COMPARISON TABLE**

| Aspect | Pressure Testing | Chaos Testing |
|--------|-----------------|---------------|
| **Goal** | Find performance limits | Find resilience weaknesses |
| **Method** | Increase load gradually | Inject random failures |
| **Question** | "How much can it handle?" | "What breaks it?" |
| **Example** | 10,000 concurrent users | Database randomly disconnects |
| **Tool** | Apache Bench, JMeter | Chaos Monkey, your chaos routes |
| **When to run** | Before production launch | Continuously in production |
| **Breaks** | System under heavy load | System under failures |

***

## 🧪 **YOUR CHAOS ENGINEERING SETUP**

I see you already have **chaos routes** in your codebase! Let's explore them [file:d7c30d5f-af83-4e40-b065-9c5968dcb46a].

### **What Chaos Testing Scenarios You Can Do:**

Looking at your `chaosController.js`:

1. **Latency Injection** - Simulate slow network
2. **Random Failures** - Random 500 errors
3. **Memory Leak** - Simulate memory problems
4. **CPU Spike** - Simulate high CPU usage
5. **Database Error** - Simulate database down
6. **Circuit Breaker** - Test failover mechanisms

***

## 🎯 **COMPLETE TEST SUITE FOR YOUR APP**

Let me provide a comprehensive testing guide:

***

## 📝 **1. FUNCTIONAL TESTS (What You Already Did) ✅**

Your current tests cover:
- ✅ CRUD operations
- ✅ Validation errors
- ✅ Authentication
- ✅ 404 errors
- ✅ Duplicate handling

**Grade: Excellent!** You've covered the basics well.

***

## 💪 **2. PRESSURE TESTING (NEW)**

### **Install Apache Bench:**
```bash
# Ubuntu/Debian
sudo apt-get install apache2-utils

# macOS
brew install apache-bench

# Or use wrk (better)
brew install wrk
```

### **Test 1: API Endpoint Load Test**

```bash
# Test: How many requests can /health handle?
ab -n 1000 -c 50 http://localhost:3000/health

# Expected output:
# Requests per second: 500-2000 (depends on your hardware)
# Time per request: 1-10ms
# Failed requests: 0
```

### **Test 2: Database Load Test**

```bash
# Test: How many concurrent user creations can database handle?
ab -n 100 -c 10 \
  -p user.json \
  -T application/json \
  http://localhost:3000/api/users
```

Create `user.json`:
```json
{"email":"loadtest@example.com","password":"test123","name":"Load Test"}
```

### **Test 3: Complex Flow Load Test**

```bash
# Using wrk with Lua script
wrk -t4 -c50 -d30s --script=load-test.lua http://localhost:3000
```

Create `load-test.lua`:
```lua
-- Generate random users
counter = 0

request = function()
  counter = counter + 1
  path = "/api/users"
  body = string.format('{"email":"user%d@test.com","password":"test123","name":"User %d"}', counter, counter)
  return wrk.format("POST", path, {["Content-Type"] = "application/json"}, body)
end
```

***

## 💥 **3. CHAOS TESTING (NEW - Using Your Built-in Chaos Routes)**

Your app has chaos engineering built-in! Here's how to use it:

### **Chaos Test 1: Latency Injection**

**Simulate slow network/database:**

```bash
# Enable 500ms latency on all requests
curl -X POST http://localhost:3000/api/chaos/latency \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"delayMs":500}'

# Now test normal operations (should be slow)
time curl http://localhost:3000/api/users
# Should take ~500ms

# Test: Does your app still work when slow?
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"slow@example.com","password":"test123","name":"Slow User"}'

# Disable latency
curl -X POST http://localhost:3000/api/chaos/latency \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}'
```

**What to check:**
- ✅ Does app still work (just slower)?
- ✅ Do traces show the delay?
- ✅ Do logs show it took 500ms?
- ❌ Does app crash? (It shouldn't!)

***

### **Chaos Test 2: Random Failures**

**Simulate random 50% failure rate:**

```bash
# Enable 50% chance of 500 Internal Server Error
curl -X POST http://localhost:3000/api/chaos/random-failure \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"failureRate":0.5}'

# Try multiple requests - half should fail
for i in {1..10}; do
  echo "Request $i:"
  curl -X GET http://localhost:3000/api/users
  echo ""
done

# Disable random failures
curl -X POST http://localhost:3000/api/chaos/random-failure \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}'
```

**What to check:**
- ✅ Does your error handling work?
- ✅ Are errors logged correctly?
- ✅ Do traces show the error?
- ❌ Does one error crash the whole app? (It shouldn't!)

***

### **Chaos Test 3: Memory Leak Simulation**

**Simulate memory leak:**

```bash
# Trigger memory leak
curl -X POST http://localhost:3000/api/chaos/memory-leak \
  -H "Content-Type: application/json" \
  -d '{"size":100}'

# Monitor memory usage
# In another terminal:
watch -n 1 'ps aux | grep node'

# Check health endpoint
curl http://localhost:3000/health
```

**What to check:**
- ✅ Does memory increase?
- ✅ Does app eventually crash?
- ✅ Can you detect the leak via metrics?

***

### **Chaos Test 4: CPU Spike Simulation**

**Simulate CPU overload:**

```bash
# Trigger CPU spike for 5 seconds
curl -X POST http://localhost:3000/api/chaos/cpu-spike \
  -H "Content-Type: application/json" \
  -d '{"duration":5000}'

# Immediately test if app is responsive
time curl http://localhost:3000/api/users
```

**What to check:**
- ✅ Is app still responsive during CPU spike?
- ✅ Do requests timeout?
- ✅ Do metrics show CPU spike?

***

### **Chaos Test 5: Database Error Simulation**

**Simulate database connection failure:**

```bash
# Trigger database error
curl -X POST http://localhost:3000/api/chaos/database-error

# Try database operations (should fail gracefully)
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test"}'
```

**What to check:**
- ✅ Does app return 500 error (not crash)?
- ✅ Is error message clear?
- ✅ Is error logged and traced?

***

### **Chaos Test 6: Circuit Breaker Test**

```bash
# Test circuit breaker pattern
curl -X POST http://localhost:3000/api/chaos/circuit-breaker-test
```

**What to check:**
- ✅ Does circuit open after failures?
- ✅ Does it recover after timeout?

***

### **Chaos Test 7: Combined Chaos**

**Enable multiple chaos scenarios at once:**

```bash
# Enable latency + random failures
curl -X POST http://localhost:3000/api/chaos/latency \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"delayMs":1000}'

curl -X POST http://localhost:3000/api/chaos/random-failure \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"failureRate":0.3}'

# Try normal operations
for i in {1..20}; do
  echo "Request $i:"
  curl -s -o /dev/null -w "Status: %{http_code}, Time: %{time_total}s\n" \
    http://localhost:3000/api/users
done

# Disable all chaos
curl -X POST http://localhost:3000/api/chaos/disable-all
```

***

## 🎯 **COMPLETE CHAOS TEST SCRIPT**

Create `chaos-tests.sh`:

```bash
#!/bin/bash

echo "🔥 Starting Chaos Engineering Tests..."
echo ""

BASE_URL="http://localhost:3000"

# Helper function
test_scenario() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📍 $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

cleanup() {
  echo "🧹 Cleaning up chaos..."
  curl -s -X POST $BASE_URL/api/chaos/disable-all
  echo "✅ Cleanup complete"
}

# Trap to ensure cleanup runs
trap cleanup EXIT

# Test 1: Baseline (No Chaos)
test_scenario "Test 1: Baseline Performance"
for i in {1..5}; do
  curl -s -o /dev/null -w "Request $i: %{http_code} in %{time_total}s\n" $BASE_URL/health
done
sleep 2

# Test 2: Latency Injection
test_scenario "Test 2: Latency Injection (500ms delay)"
curl -s -X POST $BASE_URL/api/chaos/latency \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"delayMs":500}'

for i in {1..5}; do
  curl -s -o /dev/null -w "Request $i: %{http_code} in %{time_total}s\n" $BASE_URL/health
done

curl -s -X POST $BASE_URL/api/chaos/latency \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}'
sleep 2

# Test 3: Random Failures
test_scenario "Test 3: Random Failures (50% failure rate)"
curl -s -X POST $BASE_URL/api/chaos/random-failure \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"failureRate":0.5}'

success=0
failures=0
for i in {1..10}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/users)
  if [ "$status" = "200" ]; then
    ((success++))
    echo "Request $i: ✅ Success ($status)"
  else
    ((failures++))
    echo "Request $i: ❌ Failed ($status)"
  fi
done
echo "Success rate: $success/10, Failure rate: $failures/10"

curl -s -X POST $BASE_URL/api/chaos/random-failure \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}'
sleep 2

# Test 4: CPU Spike
test_scenario "Test 4: CPU Spike (5 seconds)"
echo "Triggering CPU spike..."
curl -s -X POST $BASE_URL/api/chaos/cpu-spike \
  -H "Content-Type: application/json" \
  -d '{"duration":5000}' &

sleep 1
echo "Testing responsiveness during CPU spike..."
time curl -s $BASE_URL/health > /dev/null
sleep 5

# Test 5: Database Error
test_scenario "Test 5: Database Error Simulation"
curl -s -X POST $BASE_URL/api/chaos/database-error

echo "Attempting database operation (should fail gracefully)..."
response=$(curl -s -w "\nHTTP Status: %{http_code}" \
  -X POST $BASE_URL/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"chaos@example.com","password":"test123","name":"Chaos"}')
echo "$response"
sleep 2

# Test 6: Combined Chaos
test_scenario "Test 6: Combined Chaos (Latency + Failures)"
curl -s -X POST $BASE_URL/api/chaos/latency \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"delayMs":1000}'

curl -s -X POST $BASE_URL/api/chaos/random-failure \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"failureRate":0.3}'

echo "Testing with combined chaos..."
for i in {1..5}; do
  curl -s -o /dev/null -w "Request $i: %{http_code} in %{time_total}s\n" $BASE_URL/health
done

echo ""
echo "🏁 Chaos Engineering Tests Complete!"
echo "Check Grafana for trace visualization and metrics"
```

**Run it:**
```bash
chmod +x chaos-tests.sh
./chaos-tests.sh
```
