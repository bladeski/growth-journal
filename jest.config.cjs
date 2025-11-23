/**
 * Jest configuration for ESM + TypeScript + jsdom
 */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }]
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/__mocks__/fileMock.js',
    '\\.(png|jpg|jpeg|svg|gif)$': '<rootDir>/tests/__mocks__/fileMock.js'
  },
  testMatch: ['**/tests/jest/**/*.test.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: 'tsconfig.json'
    }
  }
};
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
  // Only load the CommonJS shim here because Jest requires setup files to be loadable
  // via `require()` and they are not transformed by ts-jest. The TypeScript shim
  // should not be listed here (it would cause "import" syntax errors in CI).
  setupFilesAfterEnv: ['<rootDir>/tests/jest/setupTests.cjs'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
};
