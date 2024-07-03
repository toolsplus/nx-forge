import { NxPlugin } from '@nx/devkit';
import { createNodes, createNodesV2 } from './graph/create-nodes';
import { createDependencies } from './graph/create-dependencies';
import { processProjectGraph } from './graph/forge-project-graph';

const nxPlugin: NxPlugin = {
  name: '@toolsplus/nx-forge',
  createNodes,
  createNodesV2,
  createDependencies,
  processProjectGraph,
};

export = nxPlugin;
