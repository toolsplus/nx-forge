import * as devkit from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import {
  getProjects,
  readJson,
  readProjectConfiguration,
  Tree,
} from '@nx/devkit';

import { applicationGenerator } from './generator';
import { ApplicationGeneratorOptions } from './schema';

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
          "targets": {},
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
          "targets": {},
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
      await applicationGenerator(tree, {
        directory: 'my-forge-app',
        unitTestRunner: 'none',
        addPlugin: true,
      });
      expect(tree.exists('jest.config.ts')).toBeFalsy();
      expect(tree.exists('my-forge-app/tsconfig.spec.json')).toBeFalsy();
      expect(tree.exists('my-forge-app/jest.config.ts')).toBeFalsy();
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

      expect(tree.read(`my-forge-app/jest.config.ts`, 'utf-8'))
        .toMatchInlineSnapshot(`
        "export default {
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

      expect(tree.read(`my-forge-app/jest.config.ts`, 'utf-8'))
        .toMatchInlineSnapshot(`
        "export default {
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
      expect(tsConfigApp.exclude).toEqual([
        'jest.config.ts',
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
        'jest.config.js',
        'src/**/*.spec.js',
        'src/**/*.test.js',
      ]);
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
