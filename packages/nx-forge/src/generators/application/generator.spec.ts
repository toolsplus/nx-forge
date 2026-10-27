import '../../test-utils/mock-devkit';
import * as devkit from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import {
  getProjects,
  readJson,
  readNxJson,
  readProjectConfiguration,
  Tree,
} from '@nx/devkit';

import { applicationGenerator } from './generator';
import { ApplicationGeneratorOptions } from './schema';

const jestConfigPath = (projectRoot: string) =>
  `${projectRoot}/jest.config.cts`;
const eslintConfigPath = (projectRoot: string) =>
  `${projectRoot}/eslint.config.mjs`;

describe('application generator', () => {
  let tree: Tree;

  beforeEach(() => {
    // Nx defaults test workspaces to oxfmt, which the generator would install on
    // demand. Prettier is already installed in this workspace.
    tree = createTreeWithEmptyWorkspace({ formatter: 'prettier' });
    jest.clearAllMocks();
  });

  describe('not nested', () => {
    it('should update project config', async () => {
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        bundler: 'webpack',
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
            "test": {
              "options": {
                "passWithNoTests": true,
              },
            },
          },
        }
      `);
    });

    it('should update project config with esbuild', async () => {
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        bundler: 'esbuild',
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
            "test": {
              "options": {
                "passWithNoTests": true,
              },
            },
          },
        }
      `);
    });

    it('should add tags to project config', async () => {
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        tags: 'one,two',
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
      expect(tsconfigApp.compilerOptions.moduleResolution).toEqual('bundler');
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
        "import baseConfig from "../eslint.config.mjs";

        export default [
            ...baseConfig
        ];
        "
      `);
    });

    it('should infer build, lint and test targets', async () => {
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        bundler: 'webpack',
      });

      const plugins = (readNxJson(tree).plugins ?? []).map((plugin) =>
        typeof plugin === 'string' ? plugin : plugin.plugin
      );
      expect(plugins).toEqual(
        expect.arrayContaining([
          '@nx/webpack/plugin',
          '@nx/eslint/plugin',
          '@nx/jest/plugin',
        ])
      );

      const webpackConfig = tree.read(
        'my-forge-app/webpack.config.js',
        'utf-8'
      );
      expect(webpackConfig).toContain('new NxAppWebpackPlugin({');
      expect(webpackConfig).toContain(`outputPath: '../dist/my-forge-app/src'`);
      expect(webpackConfig).toContain(`main: './src/index.ts'`);
    });

    it('should extend from root tsconfig.json when no tsconfig.base.json', async () => {
      tree.rename('tsconfig.base.json', 'tsconfig.json');

      await applicationGenerator(tree, {
        directory: 'my-forge-app',
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
            "test": {
              "options": {
                "passWithNoTests": true,
              },
            },
          },
        }
      `);
    });

    it('should update project config with esbuild', async () => {
      await applicationGenerator(tree, {
        bundler: 'esbuild',
        directory: 'my-dir/my-forge-app',
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
            "test": {
              "options": {
                "passWithNoTests": true,
              },
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
        "import baseConfig from "../../eslint.config.mjs";

        export default [
            ...baseConfig
        ];
        "
      `);
    });
  });

  describe('TypeScript version', () => {
    const setTypeScriptVersion = (version: string) =>
      devkit.updateJson(tree, 'package.json', (json) => ({
        ...json,
        devDependencies: { ...json.devDependencies, typescript: version },
      }));

    it('should resolve modules with node10 on TypeScript 5', async () => {
      setTypeScriptVersion('~5.9.2');

      await applicationGenerator(tree, { directory: 'my-forge-app' });

      expect(
        readJson(tree, 'my-forge-app/tsconfig.app.json').compilerOptions
      ).toEqual(
        expect.objectContaining({
          module: 'commonjs',
          moduleResolution: 'node10',
        })
      );
    });

    it('should resolve modules with bundler on TypeScript 6', async () => {
      setTypeScriptVersion('~6.0.3');

      await applicationGenerator(tree, { directory: 'my-forge-app' });

      expect(
        readJson(tree, 'my-forge-app/tsconfig.app.json').compilerOptions
      ).toEqual(
        expect.objectContaining({
          module: 'commonjs',
          moduleResolution: 'bundler',
        })
      );
    });
  });

  describe('dependencies', () => {
    it('should keep existing versions of Forge dependencies', async () => {
      devkit.updateJson(tree, 'package.json', (json) => ({
        ...json,
        dependencies: {
          ...json.dependencies,
          '@forge/api': '^8.3.0',
          '@forge/resolver': '^2.0.1',
        },
      }));

      await applicationGenerator(tree, { directory: 'my-forge-app' });

      expect(readJson(tree, 'package.json').dependencies).toEqual(
        expect.objectContaining({
          '@forge/api': '^8.3.0',
          '@forge/resolver': '^2.0.1',
        })
      );
    });
  });

  describe('--unit-test-runner none', () => {
    it('should not generate test configuration', async () => {
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        unitTestRunner: 'none',
      });
      expect(tree.exists('jest.config.ts')).toBeFalsy();
      expect(tree.exists('my-forge-app/tsconfig.spec.json')).toBeFalsy();
      expect(tree.exists('my-forge-app/jest.config.ts')).toBeFalsy();
      expect(tree.exists(jestConfigPath('my-forge-app'))).toBeFalsy();
      expect(
        readProjectConfiguration(tree, 'my-forge-app').targets?.test
      ).toBeUndefined();
      expect(readNxJson(tree).plugins ?? []).not.toContainEqual(
        expect.objectContaining({ plugin: '@nx/jest/plugin' })
      );
    });
  });

  describe('--linter', () => {
    it('should not set up linting with --linter=none', async () => {
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        linter: 'none',
      });

      expect(tree.exists(eslintConfigPath('my-forge-app'))).toBeFalsy();
      expect(readNxJson(tree).plugins ?? []).not.toContainEqual(
        expect.objectContaining({ plugin: '@nx/eslint/plugin' })
      );
    });

    it('should enable typed linting with --enableTypedLinting', async () => {
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        enableTypedLinting: true,
      });

      const eslintConfig = tree.read(eslintConfigPath('my-forge-app'), 'utf-8');
      expect(eslintConfig).toContain('projectService: true');
      expect(eslintConfig).toContain('tsconfigRootDir: import.meta.dirname');
    });
  });

  describe('--rootProject', () => {
    it('should build root projects into the Forge output path', async () => {
      await applicationGenerator(tree, {
        directory: '.',
        name: 'my-forge-app',
        rootProject: true,
      });

      expect(tree.read('webpack.config.js', 'utf-8')).toContain(
        `outputPath: './dist/src'`
      );
    });

    it('should build root esbuild projects into the Forge output path', async () => {
      await applicationGenerator(tree, {
        directory: '.',
        name: 'my-forge-app',
        rootProject: true,
        bundler: 'esbuild',
      });

      expect(
        readProjectConfiguration(tree, 'my-forge-app').targets?.build?.options
          ?.outputPath
      ).toEqual('dist/src');
    });
  });

  describe('--swcJest', () => {
    it('should use @swc/jest for jest', async () => {
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        tags: 'one,two',
        swcJest: true,
      } as ApplicationGeneratorOptions);

      expect(tree.read(jestConfigPath('my-forge-app'), 'utf-8'))
        .toMatchInlineSnapshot(`
        "module.exports = {
          displayName: 'my-forge-app',
          preset: '../jest.preset.js',
          testEnvironment: 'node',
          transform: {
            '^.+\\\\.[tj]s$': '@swc/jest'
          },
          moduleFileExtensions: ['ts', 'js', 'html'],
          coverageDirectory: '../coverage/my-forge-app'
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
      } as ApplicationGeneratorOptions);

      expect(tree.read(jestConfigPath('my-forge-app'), 'utf-8'))
        .toMatchInlineSnapshot(`
        "module.exports = {
          displayName: 'my-forge-app',
          preset: '../jest.preset.js',
          testEnvironment: 'node',
          transform: {
            '^.+\\\\.[tj]s$': 'babel-jest'
          },
          moduleFileExtensions: ['ts', 'js', 'html'],
          coverageDirectory: '../coverage/my-forge-app'
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
      } as ApplicationGeneratorOptions);
      expect(tree.exists(`my-dir/my-forge-app/jest.config.js`)).toBeTruthy();
      expect(tree.exists('my-dir/my-forge-app/src/index.js')).toBeTruthy();
    });
  });

  describe('--skipFormat', () => {
    it('should format files by default', async () => {
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
      });

      expect(devkit.formatFiles).toHaveBeenCalled();
    });

    it('should not format files when --skipFormat=true', async () => {
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        skipFormat: true,
      });

      expect(devkit.formatFiles).not.toHaveBeenCalled();
    });
  });
});
