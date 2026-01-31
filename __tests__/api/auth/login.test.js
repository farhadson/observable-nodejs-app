const { createUser, getUser } = require("../_helpers/users");
const { login } = require("../_helpers/auth");
const { uniqueEmail, pickIdFromCreateResponse, pickTokenFromLoginResponse } = require("../_helpers/util");

describe("Auth flow: POST /api/auth/login", () => {
  jest.setTimeout(30000);

  test("Scenario 1: Create user -> Login -> Get user details", async () => {
    const user = {
      email: uniqueEmail("alice"),
      password: "test123",
      name: "Alice",
    };

    const createRes = await createUser(user);
    expect([200, 201]).toContain(createRes.status);

    const id = pickIdFromCreateResponse(createRes);
    expect(id).toBeTruthy(); // adjust if your create user endpoint doesn't return an id

    const loginRes = await login({ email: user.email, password: user.password });
    expect(loginRes.status).toBe(200);

    const token = pickTokenFromLoginResponse(loginRes);
    expect(token).toBeTruthy(); // adjust to your real response shape

    const getRes = await getUser(id);
    expect(getRes.status).toBe(200);
  });

  test("Scenario 8: Wrong password fails", async () => {
    const user = {
      email: uniqueEmail("pwfail"),
      password: "test123",
      name: "PW Fail",
    };

    const createRes = await createUser(user);
    expect([200, 201]).toContain(createRes.status);

    const loginRes = await login({ email: user.email, password: "wrongpassword" });
    expect([400, 401]).toContain(loginRes.status);
  });

  test("Scenario 8: Non-existent user fails", async () => {
    const loginRes = await login({ email: "nonexistent@example.com", password: "test123" });
    expect([400, 401]).toContain(loginRes.status);
  });
});
