import {
  addDependenciesToPackageJson,
  GeneratorCallback,
  logger,
  NX_VERSION,
  Tree,
} from '@nx/devkit';
import {
  esbuildVersion,
  tsLibVersion,
  typesNodeVersion,
} from '@nx/js/src/utils/versions';
import type { NormalizedOptions } from '../schema';

async function getLatestPackageVersion(
  pkg: string
): Promise<string | undefined> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${pkg}`);
    const json = await response.json();
    return json?.['dist-tags']?.['latest'];
  } catch (error) {
    logger.error(`Failed to fetch latest version of ${pkg}: ${error}`);
    throw new Error(`Failed to fetch latest version of ${pkg}`);
  }
}

export async function addProjectDependencies(
  tree: Tree,
  options: NormalizedOptions
): Promise<GeneratorCallback> {
  const bundlers = {
    webpack: {
      '@nx/webpack': NX_VERSION,
    },
    esbuild: {
      '@nx/esbuild': NX_VERSION,
      esbuild: esbuildVersion,
    },
  } as const;

  const latestForgeApiVersion = await getLatestPackageVersion('@forge/api');
  const latestForgeResolverVersion = await getLatestPackageVersion(
    '@forge/resolver'
  );

  if (!latestForgeApiVersion) {
    logger.warn(
      `Failed to fetch latest version of @forge/api. Using 'latest' tag as version`
    );
  }

  if (!latestForgeResolverVersion) {
    logger.warn(
      `Failed to fetch latest version of @forge/resolver. Using 'latest' tag as version`
    );
  }
  const forgeDependencies = {
    '@forge/api': latestForgeApiVersion ?? 'latest',
    '@forge/resolver': latestForgeResolverVersion ?? 'latest',
  };

  return addDependenciesToPackageJson(
    tree,
    {
      ...forgeDependencies,
      tslib: tsLibVersion,
    },
    {
      ...bundlers[options.bundler ?? 'webpack'],
      '@types/node': typesNodeVersion,
    }
  );
}
