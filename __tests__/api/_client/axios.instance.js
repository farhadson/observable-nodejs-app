require("dotenv").config();
const axios = require("axios");

// BASIC_TESTS.md uses http://localhost:3000
const APP_URL = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

module.exports = axios.create({
  baseURL: APP_URL,
  validateStatus: () => true, // don't throw on 4xx/5xx; tests assert status directly
  headers: { "Content-Type": "application/json" },
});
