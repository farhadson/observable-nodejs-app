const api = require("./_client/axios.instance");

describe("Wrong endpoints (404)", () => {
  test("Scenario 7: GET /api/nonexistent -> 404", async () => {
    const res = await api.get("/api/nonexistent");
    expect(res.status).toBe(404);
  });

  test("Scenario 7: GET /wrong/path -> 404", async () => {
    const res = await api.get("/wrong/path");
    expect(res.status).toBe(404);
  });

  test("Scenario 7: POST /api/users/wrong -> 404", async () => {
    const res = await api.post("/api/users/wrong", { any: "body" });
    expect(res.status).toBe(404);
  });
});
