import { NxPlugin } from '@nx/devkit';
import { processProjectGraph } from './graph/forge-project-graph';

const nxPlugin: NxPlugin = {
  name: '@toolsplus/nx-forge',
  processProjectGraph,
};

export = nxPlugin;
