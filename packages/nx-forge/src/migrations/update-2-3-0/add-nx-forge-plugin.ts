/* eslint-disable @typescript-eslint/no-unused-vars */
import { NxJsonConfiguration, readJson, Tree, writeJson } from '@nx/devkit';

export default function update(host: Tree) {
  const nxJson: NxJsonConfiguration = readJson(host, 'nx.json');
  nxJson.plugins = nxJson.plugins || [];
  if (!nxJson.plugins.some((x) => x === '@toolsplus/nx-forge')) {
    nxJson.plugins.push('@toolsplus/nx-forge');
    writeJson(host, 'nx.json', nxJson);
  }
}
