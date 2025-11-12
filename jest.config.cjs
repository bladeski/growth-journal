module.exports = {
  // use jsdom environment for DOM APIs
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2020',
          module: 'ESNext',
          esModuleInterop: true
        },
        useESM: true
      }
    ]
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.test.+(ts|js)'],
  extensionsToTreatAsEsm: ['.ts']
};
