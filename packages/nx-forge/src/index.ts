import { NxPlugin } from '@nx/devkit';
import { createNodesV2 } from './graph/create-nodes';
import { createDependencies } from './graph/create-dependencies';

const nxPlugin: NxPlugin = {
  name: '@toolsplus/nx-forge',
  createNodesV2,
  createDependencies,
};

export = nxPlugin;
