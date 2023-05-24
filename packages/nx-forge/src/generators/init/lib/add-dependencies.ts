import type { GeneratorCallback, Tree } from '@nx/devkit';
import { addDependenciesToPackageJson } from '@nx/devkit';
import {
  forgeApiVersion,
  forgeResolverVersion,
  pluginVersion,
} from '../../../utils/versions';

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
