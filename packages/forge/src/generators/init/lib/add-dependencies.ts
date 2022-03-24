import type {GeneratorCallback, Tree} from '@nrwl/devkit';
import {addDependenciesToPackageJson} from '@nrwl/devkit';
import {forgeApiVersion, forgeResolverVersion, pluginVersion} from "../../../utils/versions";

export function addDependencies(tree: Tree): GeneratorCallback {
  return addDependenciesToPackageJson(
    tree,
    {
      '@forge/api': forgeApiVersion,
      '@forge/resolver': forgeResolverVersion,
    },
    {
      '@toolsplus/nx-forge': pluginVersion,
    }
  );
}
