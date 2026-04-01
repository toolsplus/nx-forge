import * as devkit from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import {
  getProjects,
  readJson,
  readProjectConfiguration,
  Tree,
} from '@nx/devkit';

/*
 * Force lintProjectGenerator and configurationGenerator to run with addPlugin: false
 * so these generator.spec.ts snapshots assert explicit generated targets instead of
 * depending on Nx plugin inference. This keeps the outputs deterministic in tests.
 *
 * What we verified locally:
 * - applicationGenerator() passes addPlugin through to lintProjectGenerator() and
 *   configurationGenerator() in generator.ts.
 * - These tests use createTreeWithEmptyWorkspace(), so the Tree root is '/virtual'.
 * - With addPlugin: true, current Nx does not stay inside the in-memory Tree. During a
 *   Jest test run, multiGlobWithWorkspaceContext('/virtual', ...) unexpectedly returns
 *   real workspace files such as e2e/nx-forge-e2e/project.json and
 *   e2e/nx-forge-e2e/jest.config.js.
 * - @nx/jest/plugin then calls readdirSync(join('/virtual', projectRoot)), which crashes
 *   with ENOENT for '/virtual/e2e/nx-forge-e2e'.
 * - Strangely, this bug only appeared after switching to pnpm. It is not clear why this
 *   bug was not surfaced under npm.
 *
 * Nx upstream usually takes a different approach: generator specs often keep addPlugin: true
 * and import a private test helper that mocks the project graph, for example:
 * - https://github.com/nrwl/nx/blob/master/packages/js/src/generators/library/library.spec.ts
 * - https://github.com/nrwl/nx/blob/master/packages/jest/src/generators/configuration/configuration.spec.ts
 * - https://github.com/nrwl/nx/blob/master/packages/eslint/src/generators/lint-project/lint-project.spec.ts
 * - https://github.com/nrwl/nx/blob/master/packages/nx/src/internal-testing-utils/mock-project-graph.ts
 *
 * We tried that upstream-style alternative here, but it does not work cleanly in this repo.
 * The helper is not published in the installed Nx package, and mirroring its
 * createProjectGraphAsync mock locally still left the Jest test path above failing.
 *
 * Similar Nx issues:
 * - https://github.com/nrwl/nx/issues/32588
 * - https://github.com/nrwl/nx/issues/29708
 * - https://github.com/nrwl/nx/issues/34474
 */
jest.mock('@nx/eslint', () => {
  const actual = jest.requireActual<typeof import('@nx/eslint')>('@nx/eslint');

  return {
    ...actual,
    lintProjectGenerator: jest.fn((tree, options) =>
      actual.lintProjectGenerator(tree, {
        ...options,
        addPlugin: false,
      })
    ),
  };
});

jest.mock('@nx/jest', () => {
  const actual = jest.requireActual<typeof import('@nx/jest')>('@nx/jest');

  return {
    ...actual,
    configurationGenerator: jest.fn((tree, options) =>
      actual.configurationGenerator(tree, {
        ...options,
        addPlugin: false,
      })
    ),
  };
});

import { applicationGenerator } from './generator';
import { ApplicationGeneratorOptions } from './schema';

const jestConfigPath = (projectRoot: string) =>
  `${projectRoot}/jest.config.cts`;
const eslintConfigPath = (projectRoot: string) =>
  `${projectRoot}/eslint.config.mjs`;

describe('application generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    jest.clearAllMocks();
  });

  describe('not nested', () => {
    it('should update project config', async () => {
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        bundler: 'webpack',
        addPlugin: true,
      });

      const project = readProjectConfiguration(tree, 'my-forge-app');
      expect(project).toMatchInlineSnapshot(`
        {
          "$schema": "../node_modules/nx/schemas/project-schema.json",
          "name": "my-forge-app",
          "projectType": "application",
          "root": "my-forge-app",
          "sourceRoot": "my-forge-app/src",
          "tags": [],
          "targets": {
            "lint": {
              "executor": "@nx/eslint:lint",
            },
            "test": {
              "executor": "@nx/jest:jest",
              "options": {
                "jestConfig": "my-forge-app/jest.config.cts",
              },
              "outputs": [
                "{workspaceRoot}/coverage/{projectRoot}",
              ],
            },
          },
        }
      `);
    });

    it('should update project config with esbuild', async () => {
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        bundler: 'esbuild',
        addPlugin: true,
      });

      const project = readProjectConfiguration(tree, 'my-forge-app');
      expect(project).toMatchInlineSnapshot(`
        {
          "$schema": "../node_modules/nx/schemas/project-schema.json",
          "name": "my-forge-app",
          "projectType": "application",
          "root": "my-forge-app",
          "sourceRoot": "my-forge-app/src",
          "tags": [],
          "targets": {
            "build": {
              "configurations": {
                "development": {},
                "production": {
                  "esbuildOptions": {
                    "outExtension": {
                      ".js": ".js",
                    },
                    "sourcemap": false,
                  },
                },
              },
              "defaultConfiguration": "production",
              "executor": "@nx/esbuild:esbuild",
              "options": {
                "assets": [
                  "my-forge-app/src/assets",
                ],
                "bundle": true,
                "esbuildOptions": {
                  "outExtension": {
                    ".js": ".js",
                  },
                  "sourcemap": true,
                },
                "format": [
                  "cjs",
                ],
                "generatePackageJson": false,
                "main": "my-forge-app/src/index.ts",
                "outputFileName": "index.js",
                "outputPath": "dist/my-forge-app/src",
                "platform": "node",
                "tsConfig": "my-forge-app/tsconfig.app.json",
              },
              "outputs": [
                "{options.outputPath}",
              ],
            },
            "lint": {
              "executor": "@nx/eslint:lint",
            },
            "test": {
              "executor": "@nx/jest:jest",
              "options": {
                "jestConfig": "my-forge-app/jest.config.cts",
              },
              "outputs": [
                "{workspaceRoot}/coverage/{projectRoot}",
              ],
            },
          },
        }
      `);
    });

    it('should add tags to project config', async () => {
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        tags: 'one,two',
        addPlugin: true,
      });

      const projects = Object.fromEntries(getProjects(tree));
      expect(projects).toMatchObject({
        'my-forge-app': {
          tags: ['one', 'two'],
        },
      });
    });

    it('should generate files', async () => {
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        bundler: 'webpack',
        addPlugin: true,
      });
      expect(tree.exists('my-forge-app/webpack.config.js')).toBeTruthy();
      expect(tree.exists(jestConfigPath('my-forge-app'))).toBeTruthy();
      expect(tree.exists(eslintConfigPath('my-forge-app'))).toBeTruthy();
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
      expect(tsconfigApp.compilerOptions).not.toHaveProperty('jsx');
      expect(tsconfigApp.compilerOptions).not.toHaveProperty('jsxFactory');
      expect(tsconfigApp.extends).toEqual('./tsconfig.json');
      expect(tsconfigApp.exclude.sort()).toEqual(
        [
          'jest.config.ts',
          'jest.config.cts',
          'src/**/*.spec.ts',
          'src/**/*.test.ts',
        ].sort()
      );
      expect(tsconfigApp.exclude).toContain('jest.config.cts');

      expect(tree.read(eslintConfigPath('my-forge-app'), 'utf-8'))
        .toMatchInlineSnapshot(`
        "import baseConfig from '../eslint.config.mjs';

        export default [...baseConfig];
        "
      `);
    });

    it('should extend from root tsconfig.json when no tsconfig.base.json', async () => {
      tree.rename('tsconfig.base.json', 'tsconfig.json');

      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        addPlugin: true,
      });

      const tsconfig = readJson(tree, 'my-forge-app/tsconfig.json');
      expect(tsconfig.extends).toBe('../tsconfig.json');
    });
  });

  describe('nested', () => {
    it('should update project config', async () => {
      await applicationGenerator(tree, {
        bundler: 'webpack',
        directory: 'my-dir/my-forge-app',
        addPlugin: true,
      });

      const project = readProjectConfiguration(tree, 'my-forge-app');

      expect(project).toMatchInlineSnapshot(`
        {
          "$schema": "../../node_modules/nx/schemas/project-schema.json",
          "name": "my-forge-app",
          "projectType": "application",
          "root": "my-dir/my-forge-app",
          "sourceRoot": "my-dir/my-forge-app/src",
          "tags": [],
          "targets": {
            "lint": {
              "executor": "@nx/eslint:lint",
            },
            "test": {
              "executor": "@nx/jest:jest",
              "options": {
                "jestConfig": "my-dir/my-forge-app/jest.config.cts",
              },
              "outputs": [
                "{workspaceRoot}/coverage/{projectRoot}",
              ],
            },
          },
        }
      `);
    });

    it('should update project config with esbuild', async () => {
      await applicationGenerator(tree, {
        bundler: 'esbuild',
        directory: 'my-dir/my-forge-app',
        addPlugin: true,
      });

      const project = readProjectConfiguration(tree, 'my-forge-app');

      expect(project).toMatchInlineSnapshot(`
        {
          "$schema": "../../node_modules/nx/schemas/project-schema.json",
          "name": "my-forge-app",
          "projectType": "application",
          "root": "my-dir/my-forge-app",
          "sourceRoot": "my-dir/my-forge-app/src",
          "tags": [],
          "targets": {
            "build": {
              "configurations": {
                "development": {},
                "production": {
                  "esbuildOptions": {
                    "outExtension": {
                      ".js": ".js",
                    },
                    "sourcemap": false,
                  },
                },
              },
              "defaultConfiguration": "production",
              "executor": "@nx/esbuild:esbuild",
              "options": {
                "assets": [
                  "my-dir/my-forge-app/src/assets",
                ],
                "bundle": true,
                "esbuildOptions": {
                  "outExtension": {
                    ".js": ".js",
                  },
                  "sourcemap": true,
                },
                "format": [
                  "cjs",
                ],
                "generatePackageJson": false,
                "main": "my-dir/my-forge-app/src/index.ts",
                "outputFileName": "index.js",
                "outputPath": "dist/my-dir/my-forge-app/src",
                "platform": "node",
                "tsConfig": "my-dir/my-forge-app/tsconfig.app.json",
              },
              "outputs": [
                "{options.outputPath}",
              ],
            },
            "lint": {
              "executor": "@nx/eslint:lint",
            },
            "test": {
              "executor": "@nx/jest:jest",
              "options": {
                "jestConfig": "my-dir/my-forge-app/jest.config.cts",
              },
              "outputs": [
                "{workspaceRoot}/coverage/{projectRoot}",
              ],
            },
          },
        }
      `);
    });

    it('should add tags to project config', async () => {
      await applicationGenerator(tree, {
        name: 'my-forge-app',
        directory: 'myDir',
        tags: 'one,two',
        addPlugin: true,
      });

      const projects = Object.fromEntries(getProjects(tree));
      expect(projects).toMatchObject({
        'my-forge-app': {
          tags: ['one', 'two'],
        },
      });
    });

    it('should generate files', async () => {
      await applicationGenerator(tree, {
        name: 'my-forge-app',
        directory: 'my-dir/my-forge-app/',
        addPlugin: true,
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
        const actual = lookupFn(config);
        if (Array.isArray(actual)) {
          expect(actual.sort()).toEqual(expectedValue.sort());
        } else {
          expect(actual).toEqual(expectedValue);
        }
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
            'jest.config.cts',
          ],
        },
      ].forEach(hasJsonValue);

      const nestedTsconfigApp = readJson(
        tree,
        'my-dir/my-forge-app/tsconfig.app.json'
      );
      expect(nestedTsconfigApp.exclude).toContain('jest.config.cts');

      expect(tree.exists(eslintConfigPath('my-dir/my-forge-app'))).toBeTruthy();
      expect(tree.read(eslintConfigPath('my-dir/my-forge-app'), 'utf-8'))
        .toMatchInlineSnapshot(`
        "import baseConfig from '../../eslint.config.mjs';

        export default [...baseConfig];
        "
      `);
    });
  });

  describe('--unit-test-runner none', () => {
    it('should not generate test configuration', async () => {
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        unitTestRunner: 'none',
        addPlugin: true,
      });
      expect(tree.exists('jest.config.ts')).toBeFalsy();
      expect(tree.exists('my-forge-app/tsconfig.spec.json')).toBeFalsy();
      expect(tree.exists('my-forge-app/jest.config.ts')).toBeFalsy();
      expect(tree.exists(jestConfigPath('my-forge-app'))).toBeFalsy();
    });
  });

  describe('--swcJest', () => {
    it('should use @swc/jest for jest', async () => {
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        tags: 'one,two',
        swcJest: true,
        addPlugin: true,
      } as ApplicationGeneratorOptions);

      expect(tree.read(jestConfigPath('my-forge-app'), 'utf-8'))
        .toMatchInlineSnapshot(`
        "module.exports = {
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
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        tags: 'one,two',
        babelJest: true,
        addPlugin: true,
      } as ApplicationGeneratorOptions);

      expect(tree.read(jestConfigPath('my-forge-app'), 'utf-8'))
        .toMatchInlineSnapshot(`
        "module.exports = {
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
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        js: true,
        addPlugin: true,
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
      expect(tsConfigApp.exclude.sort()).toEqual(
        [
          'jest.config.ts',
          'jest.config.cts',
          'src/**/*.spec.ts',
          'src/**/*.test.ts',
          'jest.config.js',
          'src/**/*.spec.js',
          'src/**/*.test.js',
        ].sort()
      );
    });

    it('should generate js files for nested libs as well', async () => {
      await applicationGenerator(tree, {
        name: 'my-forge-app',
        directory: 'my-dir/my-forge-app/',
        js: true,
        addPlugin: true,
      } as ApplicationGeneratorOptions);
      expect(tree.exists(`my-dir/my-forge-app/jest.config.js`)).toBeTruthy();
      expect(tree.exists('my-dir/my-forge-app/src/index.js')).toBeTruthy();
    });
  });

  describe('--skipFormat', () => {
    it('should format files by default', async () => {
      jest.spyOn(devkit, 'formatFiles');

      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        addPlugin: true,
      });

      expect(devkit.formatFiles).toHaveBeenCalled();
    });

    it('should not format files when --skipFormat=true', async () => {
      jest.spyOn(devkit, 'formatFiles');

      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        skipFormat: true,
        addPlugin: true,
      });

      expect(devkit.formatFiles).not.toHaveBeenCalled();
    });
  });
});
