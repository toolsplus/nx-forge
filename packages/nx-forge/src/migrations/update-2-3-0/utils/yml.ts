import { Tree } from '@nx/devkit';
import { ManifestSchema } from '@forge/manifest';
import { dump, DumpOptions, load, LoadOptions } from 'js-yaml';

/**
 * Reads a yaml file and parses YAML.
 *
 * @param tree - file system tree
 * @param path - file path
 * @param options - Optional YAML load options
 */
export const readYaml = (
  tree: Tree,
  path: string,
  options?: LoadOptions
): ManifestSchema => {
  if (!tree.exists(path)) {
    throw new Error(`Cannot find ${path}`);
  }
  try {
    return load(tree.read(path, 'utf-8') ?? '', options) as ManifestSchema;
  } catch (e) {
    throw new Error(
      `Cannot parse ${path}: ${e instanceof Error ? e.message : String(e)}`
    );
  }
};

/**
 * Writes a YAML value to the file system tree

 * @param tree File system tree
 * @param path Path of YAML file in the Tree
 * @param value Serializable value to write
 * @param options Optional YAML serialize options
 */
export const writeYaml = <T extends object = object>(
  tree: Tree,
  path: string,
  value: T,
  options?: DumpOptions
): void => {
  tree.write(path, dump(value, options || {}));
};
