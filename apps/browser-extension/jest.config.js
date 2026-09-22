/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jest-environment-jsdom",
  extensionsToTreatAsEsm: [".ts"],
  setupFiles: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    // @aua/contracts's package.json only declares "import"/"types" export
    // conditions (pure ESM), and its built dist/*.js output isn't run through
    // any transformer under Jest's default CJS module registry, so it fails
    // to parse `export`/`import` syntax. Mapping straight to the package's
    // TypeScript source lets ts-jest compile it the same way it compiles our
    // own sources, sidestepping both the exports-conditions mismatch and the
    // untransformed-ESM-output problem without touching the contracts package.
    "^@aua/contracts$": "<rootDir>/../../packages/contracts/src/index.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "ESNext",
          moduleResolution: "bundler",
        },
      },
    ],
  },
  testMatch: ["**/src/__tests__/**/*.test.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
};
