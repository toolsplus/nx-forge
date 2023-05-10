module.exports = {
  displayName: 'forge-e2e',
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
  coverageDirectory: '../../coverage/e2e/forge-e2e',
  preset: '../../jest.preset.js',
  setupFiles: ['dotenv/config'],
  testTimeout: 240000, // set the default test timeout to 2min for all e2e tests
};
