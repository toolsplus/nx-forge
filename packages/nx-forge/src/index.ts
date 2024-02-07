import { NxPlugin } from '@nx/devkit';
import { createNodes } from './graph/create-nodes';
import { createDependencies } from './graph/create-dependencies';
import { processProjectGraph } from './graph/forge-project-graph';

const nxPlugin: NxPlugin = {
  name: '@toolsplus/nx-forge',
  createNodes,
  createDependencies,
  processProjectGraph,
};

export = nxPlugin;
