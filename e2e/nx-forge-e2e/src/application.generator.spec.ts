import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { generateForgeApp } from './utils/generate-forge-app';
import { runNxCommandAsync } from './utils/async-commands';
import {
  cleanupTestWorkspace,
  createTestWorkspace,
} from './utils/test-workspace';

const describeDirectoryTree = (directory: string, depth = 0): string => {
  if (!existsSync(directory)) {
    return '(missing)';
  }

  const prefix = '  '.repeat(depth);
  const entries = readdirSync(directory).sort();

  return entries
    .map((entry) => {
      const entryPath = join(directory, entry);
      const isDirectory = statSync(entryPath).isDirectory();
      const label = `${prefix}${entry}${isDirectory ? '/' : ''}`;

      if (!isDirectory) {
        return label;
      }

      const childTree = describeDirectoryTree(entryPath, depth + 1);
      return childTree === '' ? label : `${label}\n${childTree}`;
    })
    .join('\n');
};

const expectWebpackBuildOutput = async (
  workspaceDirectory: string,
  appName: string
) => {
  const { stdout } = await runNxCommandAsync(`run ${appName}:build`, {
    cwd: workspaceDirectory,
  });
  const outputDir = join(workspaceDirectory, 'dist', 'apps', appName);
  const indexJsPath = join(outputDir, 'src', 'index.js');

  if (!existsSync(indexJsPath)) {
    throw new Error(
      [
        `Expected generated build output at ${indexJsPath}.`,
        `Build stdout:\n${stdout}`,
        `Output tree for ${outputDir}:\n${describeDirectoryTree(outputDir)}`,
      ].join('\n\n')
    );
  }

  expect(existsSync(join(outputDir, 'src', 'main.js'))).toBe(false);

  await runNxCommandAsync(`run ${appName}:package`, {
    cwd: workspaceDirectory,
  });
  expect(existsSync(join(outputDir, 'manifest.yml'))).toBe(true);
  expect(existsSync(join(outputDir, 'package.json'))).toBe(true);
};

const configureWebpackTaskInference = (
  workspaceDirectory: string,
  enabled: boolean
) => {
  const nxJsonPath = join(workspaceDirectory, 'nx.json');
  const nxJson = JSON.parse(readFileSync(nxJsonPath, 'utf8'));
  const plugins = (nxJson.plugins ?? []).filter((plugin) =>
    typeof plugin === 'string'
      ? plugin !== '@nx/webpack/plugin'
      : plugin.plugin !== '@nx/webpack/plugin'
  );
  nxJson.useInferencePlugins = enabled;

  if (enabled) {
    plugins.push('@nx/webpack/plugin');
  }

  nxJson.plugins = plugins;
  writeFileSync(nxJsonPath, JSON.stringify(nxJson, null, 2) + '\n', 'utf8');
};

const enableWebpackTaskInference = async (workspaceDirectory: string) => {
  configureWebpackTaskInference(workspaceDirectory, true);
  await runNxCommandAsync(
    'generate @nx/webpack:init --addPlugin=true --interactive=false',
    {
      cwd: workspaceDirectory,
    }
  );
};

const disableWebpackTaskInference = (workspaceDirectory: string) => {
  configureWebpackTaskInference(workspaceDirectory, false);
};

describe('Forge application generator', () => {
  let workspaceDirectory: string;

  beforeAll(() => {
    workspaceDirectory = createTestWorkspace();
  });

  afterAll(async () => {
    try {
      if (workspaceDirectory) {
        await runNxCommandAsync('reset', { cwd: workspaceDirectory });
      }
    } finally {
      cleanupTestWorkspace(workspaceDirectory);
    }
  });

  it('should generate a Forge app', async () => {
    const appName = await generateForgeApp({
      cwd: workspaceDirectory,
      directory: 'apps',
      options: '--bundler=webpack',
    });
    expect(
      existsSync(join(workspaceDirectory, 'apps', appName, 'manifest.yml'))
    ).toBe(true);
    expect(
      existsSync(join(workspaceDirectory, 'apps', appName, 'webpack.config.js'))
    ).toBe(true);
    expect(
      existsSync(join(workspaceDirectory, 'apps', appName, 'src', 'index.ts'))
    ).toBe(true);
  });

  describe('--directory', () => {
    it('should generate a Forge app in the specified directory', async () => {
      const subdir = 'subdir';
      const appName = await generateForgeApp({
        cwd: workspaceDirectory,
        directory: subdir,
        options: `--bundler=webpack`,
      });

      expect(
        existsSync(join(workspaceDirectory, subdir, appName, 'manifest.yml'))
      ).toBe(true);
      expect(
        existsSync(
          join(workspaceDirectory, subdir, appName, 'webpack.config.js')
        )
      ).toBe(true);
      expect(
        existsSync(join(workspaceDirectory, subdir, appName, 'src', 'index.ts'))
      ).toBe(true);
    });
  });

  describe('--tags', () => {
    it('should generate a Forge app with tags added to the project', async () => {
      const appName = await generateForgeApp({
        cwd: workspaceDirectory,
        directory: 'apps',
        options: `--tags e2etag,e2ePackage`,
      });
      const project = JSON.parse(
        readFileSync(
          join(workspaceDirectory, 'apps', appName, 'project.json'),
          'utf8'
        )
      );
      expect(project.tags).toEqual(['e2etag', 'e2ePackage']);
    });
  });

  it('should create expected output with inferred webpack plugin', async () => {
    await enableWebpackTaskInference(workspaceDirectory);

    const appName = await generateForgeApp({
      cwd: workspaceDirectory,
      directory: 'apps',
      options: '--bundler=webpack',
    });
    expect(
      readFileSync(
        join(workspaceDirectory, 'apps', appName, 'webpack.config.js'),
        'utf8'
      )
    ).toContain('NxAppWebpackPlugin');
    const project = JSON.parse(
      readFileSync(
        join(workspaceDirectory, 'apps', appName, 'project.json'),
        'utf8'
      )
    );
    expect(project.targets?.build).toBeUndefined();

    await expectWebpackBuildOutput(workspaceDirectory, appName);
  });

  it('should create expected output with legacy webpack executor', async () => {
    disableWebpackTaskInference(workspaceDirectory);

    const appName = await generateForgeApp({
      cwd: workspaceDirectory,
      directory: 'apps',
      options: '--bundler=webpack',
    });
    expect(
      readFileSync(
        join(workspaceDirectory, 'apps', appName, 'webpack.config.js'),
        'utf8'
      )
    ).toContain('composePlugins');
    const project = JSON.parse(
      readFileSync(
        join(workspaceDirectory, 'apps', appName, 'project.json'),
        'utf8'
      )
    );
    expect(project.targets?.build).toBeDefined();

    await expectWebpackBuildOutput(workspaceDirectory, appName);
  });
});
