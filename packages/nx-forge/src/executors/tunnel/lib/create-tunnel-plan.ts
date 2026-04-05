import {
  ExecutorContext,
  getOutputsForTargetAndConfiguration,
  readTargetOptions,
} from '@nx/devkit';
import { getRootTsConfigPath } from '@nx/js';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { readWebpackOptions } from '@nx/webpack/src/utils/webpack/read-webpack-options';
import { resolveUserDefinedWebpackConfig } from '@nx/webpack/src/utils/webpack/resolve-user-defined-webpack-config';
import { getCustomUiProjects } from './extract-custom-ui-projects';
import { normalizeOptions } from '../../package/executor';
import { PackageExecutorSchema } from '../../package/schema';
import { TunnelExecutorOptions } from '../schema';

export interface TunnelPlan {
  projectName: string;
  packageOutputPath: string;
  packageOutputPathAbsolute: string;
  buildOutputPath: string;
  buildRuntimePathAbsolute: string;
  manifestPathAbsolute: string;
  customUiProjects: {
    projectName: string;
    port: number;
  }[];
  buildTarget: {
    project: string;
    target: 'build';
    configuration?: string;
  };
  buildWatchOverrides: {
    watch: true;
  };
  packageOptions: ReturnType<typeof normalizeOptions>;
  tunnelOptions: TunnelExecutorOptions;
}

export async function createTunnelPlan(
  options: TunnelExecutorOptions,
  context: ExecutorContext
): Promise<TunnelPlan> {
  const projectName = context.projectName;
  if (!projectName) {
    throw new Error('No project name provided in executor context.');
  }

  const project = context.projectsConfigurations.projects[projectName];
  if (!project) {
    throw new Error(`Could not find project configuration for ${projectName}.`);
  }

  if (!project.root) {
    throw new Error(`${projectName} does not have a root.`);
  }

  if (!project.sourceRoot) {
    throw new Error(`${projectName} does not have a sourceRoot.`);
  }

  const target = {
    project: projectName,
    configuration: context.configurationName,
  };

  const rawPackageOptions = readTargetOptions(
    { ...target, target: 'package' },
    context
  ) as PackageExecutorSchema;
  const rawBuildOptions = readTargetOptions(
    { ...target, target: 'build' },
    context
  ) as {
    outputFileName?: string;
    outputPath?: string;
    webpackConfig?: string;
  };

  const packageOutputPath = resolveWorkspaceRelativePath(
    rawPackageOptions.outputPath,
    context,
    projectName
  );
  if (!packageOutputPath) {
    throw new Error(
      `Could not determine the package output path for ${projectName}.`
    );
  }

  const buildOutputPath =
    await resolveBuildOutputPath(
      options,
      rawBuildOptions,
      context,
      projectName
    );

  const buildOutputFileName = rawBuildOptions.outputFileName ?? 'index.js';
  const buildRuntimePathAbsolute = path.resolve(
    context.root,
    buildOutputPath,
    buildOutputFileName
  );

  const packageOptions = normalizeOptions(
    {
      ...rawPackageOptions,
      outputPath: packageOutputPath,
    },
    context.root,
    project.sourceRoot,
    project.root
  );

  return {
    projectName,
    packageOutputPath,
    packageOutputPathAbsolute: path.resolve(context.root, packageOutputPath),
    buildOutputPath,
    buildRuntimePathAbsolute,
    manifestPathAbsolute: path.resolve(context.root, packageOutputPath, 'manifest.yml'),
    customUiProjects: await getCustomUiProjects(context),
    buildTarget: {
      project: projectName,
      target: 'build',
      configuration: context.configurationName,
    },
    buildWatchOverrides: {
      watch: true,
    },
    packageOptions,
    tunnelOptions: options,
  };
}

async function resolveBuildOutputPath(
  options: TunnelExecutorOptions,
  buildOptions: { outputFileName?: string; outputPath?: string; webpackConfig?: string },
  context: ExecutorContext,
  projectName: string
) {
  const overriddenOutputPath = normalizeBuildPathValue(
    options.buildOutputPath,
    context,
    projectName
  );

  if (overriddenOutputPath) {
    return overriddenOutputPath;
  }

  const configuredOutputPath = normalizeBuildPathValue(
    buildOptions.outputPath,
    context,
    projectName
  );

  if (configuredOutputPath) {
    return configuredOutputPath;
  }

  const inferredTargetOutputPath = inferBuildOutputPathFromTarget(
    context,
    projectName,
    context.configurationName
  );

  if (inferredTargetOutputPath) {
    return inferredTargetOutputPath;
  }

  const webpackOutputPath = await inferBuildOutputPathFromWebpackConfig(
    buildOptions,
    context,
    projectName
  );

  if (webpackOutputPath) {
    return webpackOutputPath;
  }

  throw new Error(
    `Could not resolve a single build output path for ${projectName}. ` +
      `Tried build.options.outputPath, Nx target outputs, and webpack config inspection. ` +
      `Set the tunnel executor's buildOutputPath option to override auto-detection.`
  );
}

function inferBuildOutputPathFromTarget(
  context: ExecutorContext,
  projectName: string,
  configurationName?: string
) {
  const projectNode = context.projectGraph.nodes[projectName];

  if (!projectNode) {
    throw new Error(`Could not find project graph node for ${projectName}.`);
  }

  const [outputPath, ...otherOutputPaths] = getOutputsForTargetAndConfiguration(
    {
      project: projectName,
      target: 'build',
      configuration: configurationName,
    },
    {},
    projectNode
  );

  if (!outputPath || otherOutputPaths.length > 0) {
    return undefined;
  }

  return outputPath;
}

async function inferBuildOutputPathFromWebpackConfig(
  buildOptions: { webpackConfig?: string },
  context: ExecutorContext,
  projectName: string
) {
  const webpackConfigPath = resolveWebpackConfigPath(
    buildOptions.webpackConfig,
    context,
    projectName
  );

  if (!webpackConfigPath) {
    return undefined;
  }

  const outputPaths = new Set<string>();

  for (const outputPath of await readWebpackOutputPaths(
    webpackConfigPath,
    context.root
  )) {
    const normalizedOutputPath = normalizeBuildPathValue(
      outputPath,
      context,
      projectName
    );

    if (normalizedOutputPath) {
      outputPaths.add(normalizedOutputPath);
    }
  }

  if (outputPaths.size === 1) {
    return [...outputPaths][0];
  }

  const sourceOutputPath = normalizeBuildPathValue(
    readLiteralWebpackOutputPathFromSource(webpackConfigPath),
    context,
    projectName
  );

  if (sourceOutputPath) {
    return sourceOutputPath;
  }

  return undefined;
}

async function readWebpackOutputPaths(
  webpackConfigPath: string,
  workspaceRoot = path.resolve('.')
) {
  try {
    const globalWithGraphCreation = global as typeof global & {
      NX_GRAPH_CREATION?: boolean;
    };
    const previousGraphCreation = globalWithGraphCreation.NX_GRAPH_CREATION;
    globalWithGraphCreation.NX_GRAPH_CREATION = true;

    try {
      const webpackConfig = resolveUserDefinedWebpackConfig(
        webpackConfigPath,
        resolveRootTsConfigPath(workspaceRoot),
        true
      );
      const webpackOptions = await readWebpackOptions(webpackConfig);

      return webpackOptions
        .map((config) => config.output?.path)
        .filter((outputPath): outputPath is string => typeof outputPath === 'string');
    } finally {
      globalWithGraphCreation.NX_GRAPH_CREATION = previousGraphCreation;
    }
  } catch {
    return [];
  }
}

function resolveRootTsConfigPath(workspaceRoot: string) {
  const configuredTsConfigPath = getRootTsConfigPath();
  if (configuredTsConfigPath) {
    return path.resolve(configuredTsConfigPath);
  }

  const fallbackPaths = ['tsconfig.base.json', 'tsconfig.json'];
  for (const candidate of fallbackPaths) {
    const absoluteCandidate = path.resolve(workspaceRoot, candidate);
    if (existsSync(absoluteCandidate)) {
      return absoluteCandidate;
    }
  }

  return path.resolve(workspaceRoot, 'tsconfig.base.json');
}

function resolveWebpackConfigPath(
  webpackConfig: string | undefined,
  context: ExecutorContext,
  projectName: string
) {
  const projectRoot =
    context.projectsConfigurations.projects[projectName]?.root ?? projectName;

  const explicitWebpackConfigPath = normalizeBuildPathValue(
    webpackConfig,
    context,
    projectName
  );

  if (explicitWebpackConfigPath) {
    const absoluteWebpackConfigPath = path.resolve(
      context.root,
      explicitWebpackConfigPath
    );
    if (existsSync(absoluteWebpackConfigPath)) {
      return absoluteWebpackConfigPath;
    }
  }

  const defaultWebpackConfigNames = [
    'webpack.config.js',
    'webpack.config.ts',
    'webpack.config.mjs',
    'webpack.config.cjs',
  ];

  for (const fileName of defaultWebpackConfigNames) {
    const absoluteWebpackConfigPath = path.resolve(
      context.root,
      projectRoot,
      fileName
    );
    if (existsSync(absoluteWebpackConfigPath)) {
      return absoluteWebpackConfigPath;
    }
  }

  return undefined;
}

function readLiteralWebpackOutputPathFromSource(webpackConfigPath: string) {
  try {
    const source = readFileSync(webpackConfigPath, 'utf8');

    const outputPathMatch = source.match(
      /outputPath\s*:\s*['"`]([^'"`]+)['"`]/
    );
    if (outputPathMatch?.[1]) {
      return outputPathMatch[1];
    }

    const outputBlockPathMatch = source.match(
      /output\s*:\s*\{[\s\S]*?path\s*:\s*['"`]([^'"`]+)['"`]/
    );
    return outputBlockPathMatch?.[1];
  } catch {
    return undefined;
  }
}

function normalizeBuildPathValue(
  value: string | undefined,
  context: ExecutorContext,
  projectName: string
) {
  const resolved = resolveWorkspaceRelativePath(value, context, projectName);
  if (!resolved) {
    return undefined;
  }

  if (value?.startsWith('./') || value?.startsWith('../')) {
    const projectRoot =
      context.projectsConfigurations.projects[projectName]?.root ?? projectName;
    return path.relative(
      context.root,
      path.resolve(context.root, projectRoot, value)
    );
  }

  return resolved;
}

function resolveWorkspaceRelativePath(
  value: string | undefined,
  context: ExecutorContext,
  projectName: string
) {
  if (!value) {
    return undefined;
  }

  const projectRoot =
    context.projectsConfigurations.projects[projectName]?.root ?? projectName;

  const resolved = value
    .replace(/\{workspaceRoot\}/g, context.root)
    .replace(/\{projectRoot\}/g, projectRoot)
    .replace(/\{projectName\}/g, projectName);

  return path.isAbsolute(resolved)
    ? path.relative(context.root, resolved)
    : resolved;
}
