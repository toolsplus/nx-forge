import * as devkit from '@nx/devkit';
import type { ProjectGraph } from '@nx/devkit';

const emptyProjectGraph: ProjectGraph = {
  dependencies: {},
  nodes: {},
};

// Nx's inference generators consult the on-disk workspace graph even when the
// generator under test uses an in-memory Tree rooted at /virtual. Keep these
// unit tests at the Tree boundary; the e2e suite exercises real plugin discovery.
jest
  .spyOn(devkit, 'createProjectGraphAsync')
  .mockResolvedValue(emptyProjectGraph);

jest.mock('nx/src/devkit-internals', () => ({
  ...jest.requireActual('nx/src/devkit-internals'),
  retrieveProjectConfigurations: jest.fn(async () => ({ projects: {} })),
}));

export {};
