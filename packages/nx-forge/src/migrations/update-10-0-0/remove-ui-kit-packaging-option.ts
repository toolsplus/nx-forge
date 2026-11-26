import { formatFiles, Tree } from '@nx/devkit';
import { removePackageOption } from './lib/remove-package-option';

/**
 * The package executor now always packages UI Kit resources so that Forge can
 * load them, so it dropped the `uiKit2Packaging` option that enabled this.
 * Remove the option from the package targets of Forge apps and from target
 * defaults. No other executor has the option, so this also removes it from
 * target defaults that do not name the package executor.
 */
export default async function update(tree: Tree): Promise<void> {
  removePackageOption(tree, 'uiKit2Packaging', { fromAllTargetDefaults: true });
  await formatFiles(tree);
}
