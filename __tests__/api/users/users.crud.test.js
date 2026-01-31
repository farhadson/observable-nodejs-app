const { createUser, getAllUsers, updateUser, deleteUser } = require("../_helpers/users");
const { uniqueEmail, pickIdFromCreateResponse } = require("../_helpers/util");

describe("Users CRUD flow", () => {
  jest.setTimeout(30000);

  test("Scenario 3: Get all users returns array/list", async () => {
    const res = await getAllUsers();
    expect(res.status).toBe(200);
    // shape depends on your API; accept either array or {data:[...]}
    const list = Array.isArray(res.data) ? res.data : res.data?.data;
    expect(Array.isArray(list)).toBe(true);
  });

  test("Scenario 3: Update user then delete user", async () => {
    const createRes = await createUser({
      email: uniqueEmail("crud"),
      password: "test123",
      name: "Before Update",
    });
    expect([200, 201]).toContain(createRes.status);

    const id = pickIdFromCreateResponse(createRes);
    expect(id).toBeTruthy();

    const updateRes = await updateUser(id, { name: "Updated Name" });
    expect([200, 204]).toContain(updateRes.status);

    const deleteRes = await deleteUser(id);
    expect([200, 202, 204]).toContain(deleteRes.status);
  });
});
