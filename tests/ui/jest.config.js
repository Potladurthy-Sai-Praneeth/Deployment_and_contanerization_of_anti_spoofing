module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/setupTests.js"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy"
  },
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest"
  },
  transformIgnorePatterns: [
    "node_modules/(?!(axios)/)"
  ],
  collectCoverageFrom: [
    "../../UI/src/**/*.{js,jsx}",
    "!../../UI/src/index.js",
    "!../../UI/src/reportWebVitals.js"
  ],
  coverageReporters: ["text", "lcov", "html"],
  testMatch: [
    "<rootDir>/*.test.js"
  ],
  moduleDirectories: ["node_modules", "<rootDir>/../../UI/src"],
  testEnvironmentOptions: {
    url: "http://localhost:3000"
  },
  preset: null
};