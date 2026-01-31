const api = require("../_client/axios.instance");

async function createUser({ email, password, name }) {
  return api.post("/api/users", { email, password, name });
}

async function getAllUsers() {
  return api.get("/api/users");
}

async function getUser(id) {
  return api.get(`/api/users/${id}`);
}

async function updateUser(id, patch) {
  return api.put(`/api/users/${id}`, patch);
}

async function deleteUser(id) {
  return api.delete(`/api/users/${id}`);
}

module.exports = {
  createUser,
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
};
