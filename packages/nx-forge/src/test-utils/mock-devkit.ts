/*
 * Import this module before any other module in specs that run generators.
 *
 * Keeps the project graph empty while generators run against a virtual Tree,
 * like @nx/devkit/internal-testing-utils/mock-project-graph, which is not
 * included in the published @nx/devkit package. Without it, adding inference
 * plugins reads the real workspace graph. formatFiles is wrapped so that specs
 * can assert on it.
 */
jest.mock('@nx/devkit', () => {
  const actual = jest.requireActual<typeof import('@nx/devkit')>('@nx/devkit');
  return {
    ...actual,
    createProjectGraphAsync: jest
      .fn()
      .mockResolvedValue({ nodes: {}, dependencies: {} }),
    formatFiles: jest.fn(actual.formatFiles),
  };
});

export {};
