const { createUser } = require("../_helpers/users");
const { uniqueEmail } = require("../_helpers/util");

describe("Users batch operations", () => {
  jest.setTimeout(30000);

  test("Scenario 2: Create 10 users concurrently", async () => {
    const reqs = Array.from({ length: 10 }, (_, i) =>
      createUser({
        email: uniqueEmail(`user${i + 1}`),
        password: "test123",
        name: `User ${i + 1}`,
      })
    );

    const results = await Promise.all(reqs);

    // Expect each to succeed (commonly 201/200)
    for (const res of results) {
      expect([200, 201]).toContain(res.status);
    }
  });
});
