import { formatFiles, Tree } from '@nx/devkit';
import { removePackageOption } from './lib/remove-package-option';

/**
 * The package executor no longer generates a `package.json`, so it dropped
 * the `tsConfig` option that only served that. Remove the option from the
 * package targets of Forge apps and from target defaults.
 *
 * @see https://github.com/toolsplus/nx-forge/issues/222
 */
export default async function update(tree: Tree): Promise<void> {
  removePackageOption(tree, 'tsConfig');
  await formatFiles(tree);
}
