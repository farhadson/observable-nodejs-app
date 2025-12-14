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
```
# Send 1000 requests with 50 concurrent users
ab -n 1000 -c 50 http://localhost:3000/api/users
```

**Analogy:** 
- Regular day: 10 cars on a bridge ✅
- Pressure test: 10,000 cars on the bridge
- Question: Does the bridge collapse?

***

### **2. Chaos Testing (Chaos Engineering)**

**Goal:** See how your system handles **random failures**

**Questions it answers:**
- What happens if the database goes down?
- What happens if network is slow (500ms delay)?
- What happens if memory is full?
- Does my app crash or recover gracefully?

**Example (UPDATED to match your chaos endpoints):**
```
# Simulate database failure (explicit error type)
curl -X POST http://localhost:3000/api/chaos/database-error \
  -H "Content-Type: application/json" \
  -d '{"errorType":"CONNECTIONERROR"}'

# Simulate slow dependency (500ms delay) - latency endpoint expects:
# { service, duration, enabled }
curl -X POST http://localhost:3000/api/chaos/latency \
  -H "Content-Type: application/json" \
  -d '{"service":"database","enabled":true,"duration":500}'
```

**Analogy:**
- Regular day: Bridge works fine ✅
- Chaos test: What if a cable snaps?
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

You already have **chaos routes** in your codebase.

### **What Chaos Testing Scenarios You Can Do:**

Looking at your `chaosController.js` routes:

1. **Latency Injection** - Simulate slowness
2. **Random Failures** - Random failures via probability
3. **Memory Leak** - Simulate memory problems
4. **CPU Spike** - Simulate high CPU usage
5. **Database Error** - Simulate DB errors
6. **Circuit Breaker** - Test repeated failures pattern

***

## 💪 **2. PRESSURE TESTING (NEW)**

### **Install Apache Bench:**
```
# Ubuntu/Debian
sudo apt-get install apache2-utils

# macOS
brew install apache-bench

# Or use wrk (better)
brew install wrk
```

### **Test 1: API Endpoint Load Test**
```
# Test: How many requests can /health handle?
ab -n 1000 -c 50 http://localhost:3000/health
```

### **Test 2: Database Load Test**
```
# Test: concurrent user creations
ab -n 100 -c 10 \
  -p user.json \
  -T application/json \
  http://localhost:3000/api/users
```

Create `user.json`:
```
{"email":"loadtest@example.com","password":"test123","name":"Load Test"}
```

### **Test 3: Complex Flow Load Test**
```
# Using wrk with Lua script
wrk -t4 -c50 -d30s --script=load-test.lua http://localhost:3000
```

Create `load-test.lua`:
```
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

### **Chaos Test 1: Latency Injection**

**Simulate slow network/database:**
```
# Enable 500ms latency for database operations
curl -X POST http://localhost:3000/api/chaos/latency \
  -H "Content-Type: application/json" \
  -d '{"service":"database","enabled":true,"duration":500}'

# Now test normal operations (should be slow)
time curl http://localhost:3000/api/users

# Disable latency
curl -X POST http://localhost:3000/api/chaos/latency \
  -H "Content-Type: application/json" \
  -d '{"service":"database","enabled":false,"duration":0}'
```

**What to check:**
- ✅ Does app still work (just slower)?
- ✅ Do traces show the delay?
- ✅ Do logs show the slowdown?

***

### **Chaos Test 2: Random Failures**

**Simulate random 50% failure rate:**
```
# Enable 50% failure probability for database operations
curl -X POST http://localhost:3000/api/chaos/random-failure \
  -H "Content-Type: application/json" \
  -d '{"service":"database","enabled":true,"probability":0.5}'

# Try multiple requests - some should fail
for i in {1..10}; do
  echo "Request $i:"
  curl -X GET http://localhost:3000/api/users
  echo ""
done

# Disable random failures
curl -X POST http://localhost:3000/api/chaos/random-failure \
  -H "Content-Type: application/json" \
  -d '{"service":"database","enabled":false,"probability":0}'
```

**What to check:**
- ✅ Does your error handling work?
- ✅ Are errors logged correctly?
- ✅ Do traces show the error?

***

### **Chaos Test 3: Memory Leak Simulation**

**Simulate memory leak:**
```
# Trigger memory leak for 30 seconds (or set your own duration)
curl -X POST http://localhost:3000/api/chaos/memory-leak \
  -H "Content-Type: application/json" \
  -d '{"duration":30000}'

# Check health endpoint
curl http://localhost:3000/health
```

**What to check:**
- ✅ Does memory increase?
- ✅ Does app eventually crash?
- ✅ Can you detect the impact via metrics?

***

### **Chaos Test 4: CPU Spike Simulation**

```
# Trigger CPU spike for 5 seconds
curl -X POST http://localhost:3000/api/chaos/cpu-spike \
  -H "Content-Type: application/json" \
  -d '{"duration":5000}'

# Immediately test if app is responsive
time curl http://localhost:3000/api/users
```

***

### **Chaos Test 5: Database Error Simulation**

```
# Trigger database error (pick one: CONNECTIONERROR, TIMEOUT, DEADLOCK, CONSTRAINTVIOLATION)
curl -X POST http://localhost:3000/api/chaos/database-error \
  -H "Content-Type: application/json" \
  -d '{"errorType":"TIMEOUT"}'
```

***

### **Chaos Test 6: Circuit Breaker Test**

```
curl -X POST http://localhost:3000/api/chaos/circuit-breaker-test
```

***

### **Chaos Test 7: Combined Chaos**

```
# Enable latency + random failures (database)
curl -X POST http://localhost:3000/api/chaos/latency \
  -H "Content-Type: application/json" \
  -d '{"service":"database","enabled":true,"duration":1000}'

curl -X POST http://localhost:3000/api/chaos/random-failure \
  -H "Content-Type: application/json" \
  -d '{"service":"database","enabled":true,"probability":0.3}'

# Try normal operations
for i in {1..20}; do
  echo "Request $i:"
  curl -s -o /dev/null -w "Status: %{http_code}, Time: %{time_total}s\n" \
    http://localhost:3000/api/users
done

# Disable all chaos
curl -X POST http://localhost:3000/api/chaos/disable-all
```

### **Chaos Test 7: Combined Chaos**

```bash
# Enable latency + random failures (database)
curl -X POST http://localhost:3000/api/chaos/latency \
  -H "Content-Type: application/json" \
  -d '{"service":"database","enabled":true,"duration":1000}'

curl -X POST http://localhost:3000/api/chaos/random-failure \
  -H "Content-Type: application/json" \
  -d '{"service":"database","enabled":true,"probability":0.3}'

# Try normal operations
for i in {1..20}; do
  echo "Request $i:"
  curl -s -o /dev/null -w "Status: %{http_code}, Time: %{time_total}s\n" \
    http://localhost:3000/api/users
done

# Disable all chaos
curl -X POST http://localhost:3000/api/chaos/disable-all
```
## 🧩 **Understanding Error Codes (Prisma vs PostgreSQL)**

When using Prisma ORM, low-level database errors can surface as either:
- PostgreSQL error codes (e.g., `23505`), or
- Prisma-wrapped error codes (e.g., `P2002`), depending on where/how the error is thrown/handled.

| Error Type | PostgreSQL Code | Prisma Code | Handler Location (in this app) |
|------------|-----------------|-------------|---------------------------------|
| Unique constraint violation | `23505` | `P2002` | `userController.js` |
| Foreign key violation | `23503` | `P2003` | N/A in this app |
| Not null violation | `23502` | `P2011` | N/A in this app |
| Record not found | N/A | `P2025` | `userService.js` |

### **8) Example Test: Unique constraint (duplicate email)**

Create user:
```bash
curl -i -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test"}'
```

Try duplicate (should return 409):
```bash
curl -i -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test2"}'
```

What to check:
- Response status is 409 (conflict) on the second request.
- Logs/traces show a handled error path (not a crash).

***

## 🧨 **Chaos Testing Scenarios (Infra-level)**

These are “real dependency failure” tests, different from the built-in chaos routes (which simulate failures inside the app).

### **9) Database connection failure (real Postgres down)**

Stop PostgreSQL to simulate connection failure:

```bash
# Option 1: systemd (Linux)
sudo systemctl stop postgresql

# Option 2: Docker
docker stop postgres-container
```

Try operations (should fail gracefully and show connection errors in traces/logs):

```bash
curl -i http://localhost:3000/api/users

curl -i -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"dbdown@example.com","password":"test123","name":"DB Down"}'
```

Restart database:

```bash
sudo systemctl start postgresql
# or: docker start postgres-container
```

What to check:
- App returns an error response (500/503 depending on your handling) but stays up.
- Errors are visible in traces and in the application error metric.

***

## 🐌 **Slow Database Queries (via built-in chaos)**

### **10) Inject DB latency (5 seconds)**

```bash
curl -i -X POST http://localhost:3000/api/chaos/latency \
  -H "Content-Type: application/json" \
  -d '{"service":"database","duration":5000,"enabled":true}'
```

Now make requests (will show slow traces):

```bash
curl -i http://localhost:3000/api/users
```

Disable latency:

```bash
curl -i -X POST http://localhost:3000/api/chaos/latency \
  -H "Content-Type: application/json" \
  -d '{"service":"database","duration":0,"enabled":false}'
```

***

## 🎲 **Random Failures (via built-in chaos)**

### **11) Random failures (50% chance)**

```bash
curl -i -X POST http://localhost:3000/api/chaos/random-failure \
  -H "Content-Type: application/json" \
  -d '{"service":"database","probability":0.5,"enabled":true}'
```

Make multiple requests to see mixed success/failure traces:

```bash
for i in {1..20}; do
  echo "Attempt $i"
  curl -s -o /dev/null -w "Status: %{http_code}, Time: %{time_total}s\n" \
    http://localhost:3000/api/users
  sleep 1
done
```

Disable failures:

```bash
curl -i -X POST http://localhost:3000/api/chaos/random-failure \
  -H "Content-Type: application/json" \
  -d '{"service":"database","probability":0,"enabled":false}'
```

***

## 🧠 **Memory / CPU Pressure (via built-in chaos)**

### **12) Memory pressure (memory leak simulation)**

```bash
curl -i -X POST http://localhost:3000/api/chaos/memory-leak \
  -H "Content-Type: application/json" \
  -d '{"duration":30000}'
```

### **CPU spike simulation**

```bash
curl -i -X POST http://localhost:3000/api/chaos/cpu-spike \
  -H "Content-Type: application/json" \
  -d '{"duration":5000}'
```

What to check:
- Increased latency during CPU spike.
- Memory growth during the leak window (use container metrics / `top`).

***

## 🔁 **Circuit Breaker Testing (built-in endpoint)**

### **13) Circuit breaker test**

```bash
curl -i -X POST http://localhost:3000/api/chaos/circuit-breaker-test
```

What to check:
- Multiple failures are generated in one run.
- Traces show repeated error spans.

***

## 📈 **Load Testing with k6**

Create `load-test.js`:

```js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const users = http.get('http://localhost:3000/api/users');
  check(users, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

Run with:

```bash
k6 run load-test.js
```

Tip:
- Run k6 once with chaos disabled (baseline), then re-run while DB latency or random failures are enabled to see resilience under load.
