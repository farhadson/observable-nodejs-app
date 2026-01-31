const api = require("./_client/axios.instance");

describe("GET /health", () => {
  test("Health check responds 200", async () => {
    const res = await api.get("/health");
    expect(res.status).toBe(200);

    // Optional: if tracing is enabled, you may see X-Trace-Id
    // expect(res.headers).toHaveProperty("x-trace-id");
  });
});
