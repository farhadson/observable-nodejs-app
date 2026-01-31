const { createUser } = require("../_helpers/users");
const { uniqueEmail } = require("../_helpers/util");

describe("Users validation + duplicates", () => {
  jest.setTimeout(30000);

  test("Scenario 4: Invalid email format", async () => {
    const res = await createUser({
      email: "invalid-email",
      password: "test",
      name: "Test",
    });
    expect([400, 422]).toContain(res.status);
  });

  test("Scenario 4: Missing required fields", async () => {
    const res = await createUser({
      email: uniqueEmail("missing"),
      // password missing
      // name missing
    });
    expect([400, 422]).toContain(res.status);
  });

  test("Scenario 4: Password too short", async () => {
    const res = await createUser({
      email: uniqueEmail("shortpw"),
      password: "123",
      name: "Test",
    });
    expect([400, 422]).toContain(res.status);
  });

  test("Scenario 5: Duplicate email returns 409", async () => {
    const email = uniqueEmail("duplicate");

    const first = await createUser({
      email,
      password: "test123",
      name: "First",
    });
    expect([200, 201]).toContain(first.status);

    const second = await createUser({
      email,
      password: "test123",
      name: "Second",
    });
    expect(second.status).toBe(409);
  });
});
