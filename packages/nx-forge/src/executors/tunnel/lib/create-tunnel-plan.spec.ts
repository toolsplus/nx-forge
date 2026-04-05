import * as fs from 'node:fs';
import { ExecutorContext } from '@nx/devkit';
import { createTunnelPlan } from './create-tunnel-plan';
import { getCustomUiProjects } from './extract-custom-ui-projects';
import {
  getOutputsForTargetAndConfiguration,
  readTargetOptions,
} from '@nx/devkit';
import { getRootTsConfigPath } from '@nx/js';
import { readWebpackOptions } from '@nx/webpack/src/utils/webpack/read-webpack-options';
import { resolveUserDefinedWebpackConfig } from '@nx/webpack/src/utils/webpack/resolve-user-defined-webpack-config';

jest.mock('./extract-custom-ui-projects', () => ({
  getCustomUiProjects: jest.fn(),
}));

jest.mock('@nx/js', () => {
  const actual = jest.requireActual('@nx/js');
  return {
    ...actual,
    getRootTsConfigPath: jest.fn(),
  };
});

jest.mock('@nx/devkit', () => {
  const actual = jest.requireActual('@nx/devkit');
  return {
    ...actual,
    getOutputsForTargetAndConfiguration: jest.fn(),
    readTargetOptions: jest.fn(),
  };
});

jest.mock('@nx/webpack/src/utils/webpack/read-webpack-options', () => ({
  readWebpackOptions: jest.fn(),
}));

jest.mock(
  '@nx/webpack/src/utils/webpack/resolve-user-defined-webpack-config',
  () => ({
    resolveUserDefinedWebpackConfig: jest.fn(),
  })
);

jest.mock('node:fs', () => {
  const actual = jest.requireActual('node:fs');
  return {
    ...actual,
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
  };
});

const mockGetCustomUiProjects = jest.mocked(getCustomUiProjects);
const mockGetOutputsForTargetAndConfiguration = jest.mocked(
  getOutputsForTargetAndConfiguration
);
const mockReadTargetOptions = jest.mocked(readTargetOptions);
const mockGetRootTsConfigPath = jest.mocked(getRootTsConfigPath);
const mockReadWebpackOptions = jest.mocked(readWebpackOptions);
const mockResolveUserDefinedWebpackConfig = jest.mocked(
  resolveUserDefinedWebpackConfig
);
const mockExistsSync = jest.mocked(fs.existsSync);
const mockReadFileSync = jest.mocked(fs.readFileSync);

describe('createTunnelPlan', () => {
  const context = {
    configurationName: 'development',
    cwd: '/workspace',
    projectName: 'forge-app',
    root: '/workspace',
    projectGraph: {
      dependencies: {},
      nodes: {
        'forge-app': {
          name: 'forge-app',
          type: 'app',
          data: {
            root: 'apps/forge-app',
            sourceRoot: 'apps/forge-app/src',
            targets: {
              build: { executor: '@nx/webpack:webpack' },
              package: { executor: '@toolsplus/nx-forge:package' },
            },
          },
        },
      },
    },
    projectsConfigurations: {
      version: 2 as const,
      projects: {
        'forge-app': {
          root: 'apps/forge-app',
          sourceRoot: 'apps/forge-app/src',
          targets: {
            build: { executor: '@nx/webpack:webpack' },
            package: { executor: '@toolsplus/nx-forge:package' },
          },
        },
      },
    },
  } as unknown as ExecutorContext;

  beforeEach(() => {
    jest.resetAllMocks();
    mockGetCustomUiProjects.mockResolvedValue([
      { projectName: 'custom-ui', port: 3333 },
    ]);
    mockGetOutputsForTargetAndConfiguration.mockReturnValue([
      'dist/apps/forge-app/src',
    ]);
    mockGetRootTsConfigPath.mockReturnValue('/workspace/tsconfig.base.json');
    mockReadWebpackOptions.mockResolvedValue([]);
    mockResolveUserDefinedWebpackConfig.mockReturnValue({});
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockImplementation(() => '' as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('derives package and runtime paths from target options', async () => {
    mockReadTargetOptions.mockImplementation(({ target }) => {
      if (target === 'package') {
        return {
          outputPath: '{workspaceRoot}/dist/apps/forge-app',
          tsConfig: 'apps/forge-app/tsconfig.app.json',
          uiKit2Packaging: false,
        };
      }

      return {
        outputPath: 'dist/apps/forge-app/src',
        outputFileName: 'index.js',
      };
    });

    const plan = await createTunnelPlan({ debug: true }, context);

    expect(plan.packageOutputPath).toBe('dist/apps/forge-app');
    expect(plan.packageOutputPathAbsolute).toBe('/workspace/dist/apps/forge-app');
    expect(plan.buildRuntimePathAbsolute).toBe(
      '/workspace/dist/apps/forge-app/src/index.js'
    );
    expect(plan.packageOptions.resourcePath).toBe('resources');
    expect(plan.customUiProjects).toEqual([
      { projectName: 'custom-ui', port: 3333 },
    ]);
  });

  it('falls back to inferred build outputs when build target options omit outputPath', async () => {
    mockReadTargetOptions.mockImplementation(({ target }) => {
      if (target === 'package') {
        return {
          outputPath: 'dist/apps/forge-app',
          tsConfig: 'apps/forge-app/tsconfig.app.json',
          uiKit2Packaging: false,
        };
      }

      return {
        outputFileName: 'handler.js',
      };
    });

    const plan = await createTunnelPlan({}, context);

    expect(plan.buildOutputPath).toBe('dist/apps/forge-app/src');
    expect(plan.buildRuntimePathAbsolute).toBe(
      '/workspace/dist/apps/forge-app/src/handler.js'
    );
  });

  it('prefers buildOutputPath override over inference', async () => {
    mockGetOutputsForTargetAndConfiguration.mockReturnValue([
      'dist/apps/forge-app',
      'apps/forge-app/dist',
    ]);
    mockReadTargetOptions.mockImplementation(({ target }) => {
      if (target === 'package') {
        return {
          outputPath: 'dist/apps/forge-app',
          tsConfig: 'apps/forge-app/tsconfig.app.json',
          uiKit2Packaging: false,
        };
      }

      return {
        outputFileName: 'handler.js',
      };
    });

    const plan = await createTunnelPlan(
      { buildOutputPath: 'dist/overrides/forge-app/src' },
      context
    );

    expect(plan.buildOutputPath).toBe('dist/overrides/forge-app/src');
    expect(plan.buildRuntimePathAbsolute).toBe(
      '/workspace/dist/overrides/forge-app/src/handler.js'
    );
  });

  it('falls back to webpack config inspection when Nx outputs are ambiguous', async () => {
    mockGetOutputsForTargetAndConfiguration.mockReturnValue([
      'dist/apps/forge-app',
      'apps/forge-app/dist',
    ]);
    mockReadTargetOptions.mockImplementation(({ target }) => {
      if (target === 'package') {
        return {
          outputPath: 'dist/apps/forge-app',
          tsConfig: 'apps/forge-app/tsconfig.app.json',
          uiKit2Packaging: false,
        };
      }

      return {
        outputFileName: 'handler.js',
        webpackConfig: 'apps/forge-app/webpack.config.js',
      };
    });

    mockExistsSync.mockImplementation((candidate) =>
      String(candidate).endsWith('apps/forge-app/webpack.config.js')
    );
    mockReadFileSync.mockImplementation((candidate) => {
      if (String(candidate).endsWith('apps/forge-app/webpack.config.js')) {
        return "new NxAppWebpackPlugin({ outputPath: 'dist/apps/forge-app/src' })" as never;
      }

      return '' as never;
    });

    const plan = await createTunnelPlan({}, context);

    expect(plan.buildOutputPath).toBe('dist/apps/forge-app/src');
    expect(plan.buildRuntimePathAbsolute).toBe(
      '/workspace/dist/apps/forge-app/src/handler.js'
    );
  });
});
