const { getUser, updateUser, deleteUser } = require("../_helpers/users");

describe("Users not-found errors", () => {
  test("Scenario 6: Get non-existent user (99999)", async () => {
    const res = await getUser(99999);
    expect(res.status).toBe(404);
  });

  test("Scenario 6: Update non-existent user (99999)", async () => {
    const res = await updateUser(99999, { name: "Ghost User" });
    expect(res.status).toBe(404);
  });

  test("Scenario 6: Delete non-existent user (99999)", async () => {
    const res = await deleteUser(99999);
    expect(res.status).toBe(404);
  });
});
