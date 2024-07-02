module.exports = {
  displayName: 'nx-forge-e2e',
  globals: {},
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/e2e/nx-forge-e2e',
  preset: '../../jest.preset.js',
  setupFiles: ['dotenv/config'],
  globalSetup: '../../tools/scripts/start-local-registry.ts',
  globalTeardown: '../../tools/scripts/stop-local-registry.ts',
  testTimeout: 240000, // set the default test timeout to 2min for all e2e tests
};
