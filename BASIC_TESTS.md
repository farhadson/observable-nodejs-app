# BASIC_TESTS.md — Basic Test Scenarios

These tests cover the core API flows (users + auth) and common error paths to generate traces, logs, and request metrics during normal development.  
Chaos engineering tests belong in `ADVANCED_TESTS.md` (not here).

---

## Before you start

- App base URL: `http://localhost:3000`
- Health: `GET /health`
- Users: `/api/users`
- Login: `POST /api/auth/login`

Tip: use `curl -i` to see response headers like `X-Trace-Id` when tracing is active.

---

## Normal operation scenarios

## 1) Complete user registration flow

Flow: Create user → Login → Get user details

```bash
# Create user
curl -i -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"test123","name":"Alice"}'

# Login
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"test123"}'

# Get user details (adjust the ID based on your DB)
curl -i http://localhost:3000/api/users/1
```

---

## 2) Batch operations

Create multiple users rapidly to see concurrent traces:

```bash
for i in {1..10}; do
  curl -s -X POST http://localhost:3000/api/users \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"user$i@example.com\",\"password\":\"test123\",\"name\":\"User $i\"}" &
done
wait
```

---

## 3) Update and delete flow

Flow: Get all users → Update user → Delete user

```bash
# Get all users
curl -s http://localhost:3000/api/users | jq

# Update user (adjust ID)
curl -i -X PUT http://localhost:3000/api/users/5 \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'

# Delete user (adjust ID)
curl -i -X DELETE http://localhost:3000/api/users/5
```

---

## Error scenarios

## 4) Validation errors

Invalid email format:
```bash
curl -i -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","password":"test","name":"Test"}'
```

Missing required fields:
```bash
curl -i -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Password too short:
```bash
curl -i -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123","name":"Test"}'
```

---

## 5) Duplicate email error

Create user:
```bash
curl -i -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"duplicate@example.com","password":"test123","name":"First"}'
```

Try to create again (should fail with 409):
```bash
curl -i -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"duplicate@example.com","password":"test123","name":"Second"}'
```

---

## 6) Not found errors

Get non-existent user:
```bash
curl -i http://localhost:3000/api/users/99999
```

Update non-existent user:
```bash
curl -i -X PUT http://localhost:3000/api/users/99999 \
  -H "Content-Type: application/json" \
  -d '{"name":"Ghost User"}'
```

Delete non-existent user:
```bash
curl -i -X DELETE http://localhost:3000/api/users/99999
```

---

## 7) Wrong endpoint (404)

```bash
curl -i http://localhost:3000/api/nonexistent
curl -i http://localhost:3000/wrong/path
curl -i -X POST http://localhost:3000/api/users/wrong
```

---

## 8) Authentication failures

Wrong password:
```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"wrongpassword"}'
```

Non-existent user:
```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@example.com","password":"test123"}'
```
