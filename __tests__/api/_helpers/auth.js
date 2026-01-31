const api = require("../_client/axios.instance");

async function login({ email, password }) {
  return api.post("/api/auth/login", { email, password });
}

module.exports = { login };
