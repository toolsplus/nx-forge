import { CreateNodesContextV2, CreateNodesResult } from '@nx/devkit';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createNodesV2 } from './create-nodes';

describe('createNodesV2', () => {
  let workspaceRoot: string;

  const addForgeProject = (projectRoot: string, files: string[]) => {
    mkdirSync(join(workspaceRoot, projectRoot), { recursive: true });
    files.forEach((file) =>
      writeFileSync(join(workspaceRoot, projectRoot, file), '')
    );
  };

  const createNodes = async (
    manifestFilePath: string
  ): Promise<CreateNodesResult | undefined> => {
    const context: CreateNodesContextV2 = {
      workspaceRoot,
      nxJsonConfiguration: {},
    };
    const [[, result]] = await createNodesV2[1](
      [manifestFilePath],
      undefined,
      context
    );
    return result;
  };

  const forgeOutputPaths = (
    result: CreateNodesResult | undefined,
    projectRoot: string
  ) =>
    Object.fromEntries(
      Object.entries(result?.projects?.[projectRoot]?.targets ?? {}).map(
        ([targetName, target]) => [
          targetName,
          target.options?.outputPath ?? target.options?.cwd,
        ]
      )
    );

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'nx-forge-create-nodes-'));
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('should package nested Forge apps into dist/<project root>', async () => {
    addForgeProject('apps/my-app', ['manifest.yml', 'project.json']);

    const result = await createNodes('apps/my-app/manifest.yml');

    expect(forgeOutputPaths(result, 'apps/my-app')).toEqual({
      register: '{workspaceRoot}/dist/apps/my-app',
      package: '{workspaceRoot}/dist/apps/my-app',
      tunnel: '{workspaceRoot}/dist/apps/my-app',
      deploy: '{workspaceRoot}/dist/apps/my-app',
      forge: '{workspaceRoot}/dist/apps/my-app',
    });
  });

  it('should package root Forge apps into dist', async () => {
    addForgeProject('.', ['manifest.yml', 'project.json']);

    const result = await createNodes('manifest.yml');

    expect(forgeOutputPaths(result, '.')).toEqual({
      register: '{workspaceRoot}/dist',
      package: '{workspaceRoot}/dist',
      tunnel: '{workspaceRoot}/dist',
      deploy: '{workspaceRoot}/dist',
      forge: '{workspaceRoot}/dist',
    });
  });

  it('should not create a project without a project.json', async () => {
    addForgeProject('apps/my-app', ['manifest.yml']);

    const result = await createNodes('apps/my-app/manifest.yml');

    expect(result).toEqual({});
  });
});
