# Test Scenarios for Tracing

## Normal Operation Scenarios

### 1. Complete User Registration Flow

**Flow**: Create user → Login → Get user details

```
# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"test123","name":"Alice"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"test123"}'

# Get user details
curl http://localhost:3000/api/users/1

```

---

### 2. Batch Operations

Create multiple users rapidly to see concurrent traces:

```
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/users \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"user$i@example.com\",\"password\":\"test123\",\"name\":\"User $i\"}" &
done
```

### 3. Update and Delete Flow

**Flow**: Get all users → Update specific user → Delete user

```
# Get all users
curl http://localhost:3000/api/users | jq

# Update user
curl -X PUT http://localhost:3000/api/users/5 \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'

# Delete user
curl -X DELETE http://localhost:3000/api/users/5
```

---

## Error Scenarios

### 4. Validation Errors

**Invalid email format:**

```
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","password":"test","name":"Test"}'
```

**Missing required fields:**

```
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Password too short:**

```
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123","name":"Test"}'
```

---

### 5. Duplicate Email Error

**Create user:**

```
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"duplicate@example.com","password":"test123","name":"First"}'
```

**Try to create again (should fail with 409):**

```
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"duplicate@example.com","password":"test123","name":"Second"}'
```

---

### 6. Not Found Errors

**Try to get non-existent user:**

```
curl http://localhost:3000/api/users/99999
```

**Try to update non-existent user:**

```
curl -X PUT http://localhost:3000/api/users/99999 \
  -H "Content-Type: application/json" \
  -d '{"name":"Ghost User"}'
```

**Try to delete non-existent user:**

```
curl -X DELETE http://localhost:3000/api/users/99999
```

---

### 7. Wrong Endpoint (404)

Access non-existent routes:

```
curl http://localhost:3000/api/nonexistent
curl http://localhost:3000/wrong/path
curl -X POST http://localhost:3000/api/users/wrong
```

---

### 8. Authentication Failures

**Wrong password:**

```
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"wrongpassword"}'
```

**Non-existent user:**

```
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@example.com","password":"test123"}'
```