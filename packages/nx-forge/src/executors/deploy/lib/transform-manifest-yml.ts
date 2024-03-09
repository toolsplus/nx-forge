import jsonata, { Expression } from 'jsonata';
import { DeployExecutorOptions } from '../schema';
import {
  readManifestYml,
  validateManifestContent,
  writeManifestYml,
} from '../../../utils/forge/manifest-yml';
import { ExecutorContext, joinPathFragments } from '@nx/devkit';

type Options = Pick<
  DeployExecutorOptions,
  'outputPath' | 'manifestTransform' | 'verify'
>;

export const transformManifestYml = async (
  options: Options,
  context: ExecutorContext
) => {
  let expression: Expression;
  try {
    expression = jsonata(options.manifestTransform);
  } catch (error) {
    throw new Error(
      `Failed to parse expression '${options.manifestTransform}': ${
        error.message ?? JSON.stringify(error)
      }`
    );
  }

  const manifestPath = joinPathFragments(
    context.root,
    options.outputPath,
    'manifest.yml'
  );

  const manifest = await readManifestYml(manifestPath);

  expression.registerFunction('env', (s) => process.env[s], '<s:(sl)>');

  const transformedManifest = await expression.evaluate(manifest);

  if (options.verify) {
    await validateManifestContent(transformedManifest);
  }

  writeManifestYml(manifestPath, transformedManifest);
};
