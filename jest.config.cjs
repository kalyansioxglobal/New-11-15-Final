module.exports = {
  testEnvironment: "node",
  testMatch: [
    "**/tests/critical/**/*.test.[jt]s?(x)",
    "**/tests/connectivity/**/*.test.[jt]s?(x)",
    "**/tests/flows/**/*.test.[jt]s?(x)",
    "**/tests/smoke/**/*.test.[jt]s?(x)",
  ],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.jest.json",
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/tests/jest.setup.ts"],
};
