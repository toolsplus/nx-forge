import * as devkit from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import {
  getProjects,
  readJson,
  readProjectConfiguration,
  Tree,
} from '@nx/devkit';

import generator from './generator';
import { ApplicationGeneratorOptions } from './schema';

describe('application generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    jest.clearAllMocks();
  });

  describe('not nested', () => {
    it('should update project config', async () => {
      await generator(tree, {
        name: 'my-forge-app',
        projectNameAndRootFormat: 'as-provided',
      });

      const project = readProjectConfiguration(tree, 'my-forge-app');

      expect(project.root).toEqual('my-forge-app');

      const executor = (name: string) => `@toolsplus/nx-forge:${name}`;
      const expectedExecutorTargets = [
        ['register', 'register'],
        ['build', 'build'],
        ['serve', 'tunnel'],
        ['deploy', 'deploy'],
        ['install', 'install'],
      ];
      expectedExecutorTargets.forEach(([target, executorName]) =>
        expect(project.targets[target].executor).toEqual(executor(executorName))
      );

      expect(project.targets).toEqual(
        expect.objectContaining({
          register: {
            executor: '@toolsplus/nx-forge:register',
            options: {
              outputPath: 'dist/my-forge-app',
            },
          },
          build: {
            executor: '@toolsplus/nx-forge:build',
            outputs: ['{options.outputPath}'],
            options: {
              outputPath: 'dist/my-forge-app',
              webpackConfig: 'my-forge-app/webpack.config.js',
            },
          },
          serve: {
            executor: '@toolsplus/nx-forge:tunnel',
            options: {
              outputPath: 'dist/my-forge-app',
            },
          },
          deploy: {
            executor: '@toolsplus/nx-forge:deploy',
            options: {
              outputPath: 'dist/my-forge-app',
            },
          },
          install: {
            executor: '@toolsplus/nx-forge:install',
            options: {
              outputPath: 'dist/my-forge-app',
            },
          },
          lint: {
            executor: '@nx/eslint:lint',
            outputs: ['{options.outputFile}'],
          },
          test: {
            executor: '@nx/jest:jest',
            outputs: ['{workspaceRoot}/coverage/{projectRoot}'],
            options: {
              jestConfig: 'my-forge-app/jest.config.ts',
            },
          },
        })
      );
    });

    it('should add tags to project config', async () => {
      await generator(tree, {
        name: 'my-forge-app',
        tags: 'one,two',
        projectNameAndRootFormat: 'as-provided',
      });

      const projects = Object.fromEntries(getProjects(tree));
      expect(projects).toMatchObject({
        'my-forge-app': {
          tags: ['one', 'two'],
        },
      });
    });

    it('should generate files', async () => {
      await generator(tree, {
        name: 'my-forge-app',
        projectNameAndRootFormat: 'as-provided',
      });
      expect(tree.exists('my-forge-app/jest.config.ts')).toBeTruthy();
      expect(tree.exists('my-forge-app/manifest.yml')).toBeTruthy();
      expect(tree.exists('my-forge-app/src/index.ts')).toBeTruthy();

      const tsconfig = readJson(tree, 'my-forge-app/tsconfig.json');
      expect(tsconfig).toMatchInlineSnapshot(`
        {
          "compilerOptions": {
            "esModuleInterop": true,
          },
          "extends": "../tsconfig.base.json",
          "files": [],
          "include": [],
          "references": [
            {
              "path": "./tsconfig.app.json",
            },
            {
              "path": "./tsconfig.spec.json",
            },
          ],
        }
      `);

      const tsconfigApp = readJson(tree, 'my-forge-app/tsconfig.app.json');
      expect(tsconfigApp.compilerOptions.outDir).toEqual('../dist/out-tsc');
      expect(tsconfigApp.compilerOptions.jsx).toEqual('react');
      expect(tsconfigApp.compilerOptions.jsxFactory).toEqual(
        'ForgeUI.createElement'
      );
      expect(tsconfigApp.extends).toEqual('./tsconfig.json');
      expect(tsconfigApp.exclude).toEqual([
        'jest.config.ts',
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
      ]);

      const eslintrc = readJson(tree, 'my-forge-app/.eslintrc.json');
      expect(eslintrc).toMatchInlineSnapshot(`
        {
          "extends": [
            "../.eslintrc.json",
          ],
          "ignorePatterns": [
            "!**/*",
          ],
          "overrides": [
            {
              "files": [
                "*.ts",
                "*.tsx",
                "*.js",
                "*.jsx",
              ],
              "rules": {},
            },
            {
              "files": [
                "*.ts",
                "*.tsx",
              ],
              "rules": {},
            },
            {
              "files": [
                "*.js",
                "*.jsx",
              ],
              "rules": {},
            },
          ],
        }
      `);
    });

    it('should extend from root tsconfig.json when no tsconfig.base.json', async () => {
      tree.rename('tsconfig.base.json', 'tsconfig.json');

      await generator(tree, {
        name: 'my-forge-app',
        projectNameAndRootFormat: 'as-provided',
      });

      const tsconfig = readJson(tree, 'my-forge-app/tsconfig.json');
      expect(tsconfig.extends).toBe('../tsconfig.json');
    });
  });

  describe('nested', () => {
    it('should update project config', async () => {
      await generator(tree, {
        name: 'my-forge-app',
        directory: 'my-dir/my-forge-app',
        projectNameAndRootFormat: 'as-provided',
      });

      const project = readProjectConfiguration(tree, 'my-forge-app');

      expect(project.root).toEqual('my-dir/my-forge-app');

      expect(project.targets.lint).toEqual({
        executor: '@nx/eslint:lint',
        outputs: ['{options.outputFile}'],
      });
    });

    it('should add tags to project config', async () => {
      await generator(tree, {
        name: 'my-forge-app',
        directory: 'myDir',
        tags: 'one,two',
      });

      const projects = Object.fromEntries(getProjects(tree));
      expect(projects).toMatchObject({
        'my-dir-my-forge-app': {
          tags: ['one', 'two'],
        },
      });
    });

    it('should generate files', async () => {
      await generator(tree, {
        name: 'my-forge-app',
        directory: 'myDir',
      });

      [
        `my-dir/my-forge-app/tsconfig.json`,
        `my-dir/my-forge-app/manifest.yml`,
        'my-dir/my-forge-app/src/index.ts',
      ].forEach((path) => {
        expect(tree.exists(path)).toBeTruthy();
      });

      const hasJsonValue = ({ path, expectedValue, lookupFn }) => {
        const config = readJson(tree, path);
        expect(lookupFn(config)).toEqual(expectedValue);
      };

      [
        {
          path: 'my-dir/my-forge-app/tsconfig.app.json',
          lookupFn: (json) => json.compilerOptions.outDir,
          expectedValue: '../../dist/out-tsc',
        },
        {
          path: 'my-dir/my-forge-app/tsconfig.app.json',
          lookupFn: (json) => json.compilerOptions.types,
          expectedValue: ['node'],
        },
        {
          path: 'my-dir/my-forge-app/tsconfig.app.json',
          lookupFn: (json) => json.exclude,
          expectedValue: [
            'jest.config.ts',
            'src/**/*.spec.ts',
            'src/**/*.test.ts',
          ],
        },
        {
          path: 'my-dir/my-forge-app/.eslintrc.json',
          lookupFn: (json) => json.extends,
          expectedValue: ['../../.eslintrc.json'],
        },
      ].forEach(hasJsonValue);
    });
  });

  describe('--unit-test-runner none', () => {
    it('should not generate test configuration', async () => {
      await generator(tree, {
        name: 'my-forge-app',
        unitTestRunner: 'none',
      });
      expect(tree.exists('jest.config.ts')).toBeFalsy();
      expect(tree.exists('my-forge-app/tsconfig.spec.json')).toBeFalsy();
      expect(tree.exists('my-forge-app/jest.config.ts')).toBeFalsy();
      const project = readProjectConfiguration(tree, 'my-forge-app');
      expect(project.targets.test).toBeUndefined();
      expect(project.targets.lint).toEqual({
        executor: '@nx/eslint:lint',
        outputs: ['{options.outputFile}'],
      });
    });
  });

  describe('--swcJest', () => {
    it('should use @swc/jest for jest', async () => {
      await generator(tree, {
        name: 'my-forge-app',
        tags: 'one,two',
        swcJest: true,
      } as ApplicationGeneratorOptions);

      expect(tree.read(`my-forge-app/jest.config.ts`, 'utf-8'))
        .toMatchInlineSnapshot(`
        "/* eslint-disable */
        export default {
          displayName: 'my-forge-app',
          preset: '../jest.preset.js',
          testEnvironment: 'node',
          transform: {
            '^.+\\\\.[tj]s$': '@swc/jest',
          },
          moduleFileExtensions: ['ts', 'js', 'html'],
          coverageDirectory: '../coverage/my-forge-app',
        };
        "
      `);
    });
  });

  describe('--babelJest (deprecated)', () => {
    it('should use babel for jest', async () => {
      await generator(tree, {
        name: 'my-forge-app',
        tags: 'one,two',
        babelJest: true,
      } as ApplicationGeneratorOptions);

      expect(tree.read(`my-forge-app/jest.config.ts`, 'utf-8'))
        .toMatchInlineSnapshot(`
        "/* eslint-disable */
        export default {
          displayName: 'my-forge-app',
          preset: '../jest.preset.js',
          testEnvironment: 'node',
          transform: {
            '^.+\\\\.[tj]s$': 'babel-jest',
          },
          moduleFileExtensions: ['ts', 'js', 'html'],
          coverageDirectory: '../coverage/my-forge-app',
        };
        "
      `);
    });
  });

  describe('--js flag', () => {
    it('should generate js files instead of ts files', async () => {
      await generator(tree, {
        name: 'my-forge-app',
        js: true,
      } as ApplicationGeneratorOptions);

      expect(tree.exists(`my-forge-app/jest.config.js`)).toBeTruthy();
      expect(tree.exists('my-forge-app/src/index.js')).toBeTruthy();

      const tsConfig = readJson(tree, 'my-forge-app/tsconfig.json');
      expect(tsConfig.compilerOptions).toEqual({
        allowJs: true,
        esModuleInterop: true,
      });

      const tsConfigApp = readJson(tree, 'my-forge-app/tsconfig.app.json');
      expect(tsConfigApp.include).toEqual(['src/**/*.ts', 'src/**/*.js']);
      expect(tsConfigApp.exclude).toEqual([
        'jest.config.ts',
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.js',
        'src/**/*.test.js',
      ]);
    });

    it('should generate js files for nested libs as well', async () => {
      await generator(tree, {
        name: 'my-forge-app',
        directory: 'myDir',
        js: true,
      } as ApplicationGeneratorOptions);
      expect(tree.exists(`my-dir/my-forge-app/jest.config.js`)).toBeTruthy();
      expect(tree.exists('my-dir/my-forge-app/src/index.js')).toBeTruthy();
    });
  });

  describe('--skipFormat', () => {
    it('should format files by default', async () => {
      jest.spyOn(devkit, 'formatFiles');

      await generator(tree, { name: 'my-forge-app' });

      expect(devkit.formatFiles).toHaveBeenCalled();
    });

    it('should not format files when --skipFormat=true', async () => {
      jest.spyOn(devkit, 'formatFiles');

      await generator(tree, {
        name: 'my-forge-app',
        skipFormat: true,
      });

      expect(devkit.formatFiles).not.toHaveBeenCalled();
    });
  });
});
