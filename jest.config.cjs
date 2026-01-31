/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  testTimeout: 30000, // 30s for every test + hooks
};


//// ESM syntax ////

// /** @type {import('jest').Config} */
// const config = {
//   testEnvironment: "node",
//   testMatch: ["**/__tests__/**/*.test.js"],
//   testTimeout: 30000,
// };

// export default config;
