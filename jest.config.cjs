/* eslint-env node */
module.exports = {
  // Use the ts-jest ESM preset so TypeScript files under 'type: module' are handled.
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  // Treat TypeScript files as ESM and instruct ts-jest to emit ESM so imports
  // like `import ... from` work when package.json has "type": "module".
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest'],
  },
  moduleNameMapper: {
    '^bundle-text:(.*)$': '<rootDir>/tests/__mocks__/textMock.mjs',
    '\\.(css|pug)$': '<rootDir>/tests/__mocks__/fileMock.mjs',
    '^@bladeski/logger$': '<rootDir>/__mocks__/@bladeski/logger.js',
  },
  testMatch: ['<rootDir>/tests/jest/**/*.test.ts'],
  // Load test-environment helpers (TextEncoder/TextDecoder shim)
  setupFilesAfterEnv: ['<rootDir>/tests/jest/setupTests.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
};
