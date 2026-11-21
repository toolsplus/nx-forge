import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import {
  addProjectConfiguration,
  readProjectConfiguration,
  TargetConfiguration,
  Tree,
} from '@nx/devkit';

import update from './bundle-dependencies';

const webpackConfig = (pluginOptions: string) =>
  `const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');

module.exports = {
  output: {
    library: { type: 'commonjs2' },
    filename: 'index.js',
  },
  plugins: [
    new NxAppWebpackPlugin({
${pluginOptions}    }),
  ],
};
`;

const generatedPluginOptions = `      target: 'node',
      compiler: 'tsc',
      outputPath: '../../dist/apps/my-app/src',
      main: './src/index.ts',
      outputFileName: 'index.js',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      deleteOutputPath: false,
`;

const migratedPluginOptions = `      // Forge ships the bundle as it is, so it must include all dependencies
      // except Node built-ins.
      externalDependencies: 'none',
      target: 'node',
      compiler: 'tsc',
      outputPath: '../../dist/apps/my-app/functions',
      main: './src/index.ts',
      outputFileName: 'index.js',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      deleteOutputPath: false,
`;

const esbuildTarget = (
  options: Record<string, unknown>,
  configurations: Record<string, Record<string, unknown>> = {}
): TargetConfiguration => ({
  executor: '@nx/esbuild:esbuild',
  outputs: ['{options.outputPath}'],
  options: {
    platform: 'node',
    outputPath: 'dist/apps/my-app/src',
    format: ['cjs'],
    bundle: true,
    main: 'apps/my-app/src/index.ts',
    ...options,
  },
  configurations,
});

describe('10.0.0 migration (bundle dependencies)', () => {
  let tree: Tree;

  const addForgeApp = (
    targets: Record<string, TargetConfiguration> = {},
    root = 'apps/my-app'
  ) => {
    addProjectConfiguration(tree, 'my-app', { root, targets });
    tree.write(`${root}/manifest.yml`, 'modules: {}\n');
  };

  const readWebpackConfig = () =>
    tree.read('apps/my-app/webpack.config.js', 'utf-8');

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  describe('webpack', () => {
    it('should inline dependencies and write to the bundle folder', async () => {
      addForgeApp();
      tree.write(
        'apps/my-app/webpack.config.js',
        webpackConfig(generatedPluginOptions)
      );

      await update(tree);

      expect(readWebpackConfig()).toEqual(webpackConfig(migratedPluginOptions));
    });

    it('should keep externalDependencies none and a bundle output path', async () => {
      const config = webpackConfig(
        `      outputPath: "../../dist/apps/my-app/functions",\n      externalDependencies: 'none',\n`
      );
      addForgeApp();
      tree.write('apps/my-app/webpack.config.js', config);

      await update(tree);

      expect(readWebpackConfig()).toEqual(config);
    });

    it.each([
      [`      outputPath: join(__dirname, 'dist'),\n`],
      [`      outputPath: '../../dist/apps/my-app/out',\n`],
      [
        `      outputPath: '../../dist/apps/my-app/src',\n      externalDependencies: 'all',\n`,
      ],
      [
        `      outputPath: '../../dist/apps/my-app/src',\n      // outputPath: '../../dist/apps/old-app/src',\n`,
      ],
    ])(
      'should return next steps for plugin options it cannot migrate (%#)',
      async (pluginOptions) => {
        const config = webpackConfig(pluginOptions);
        addForgeApp();
        tree.write('apps/my-app/webpack.config.js', config);

        const result = await update(tree);

        expect(readWebpackConfig()).toEqual(config);
        expect(result?.nextSteps).toEqual(
          expect.arrayContaining([
            expect.stringMatching(
              /Update these Forge app build configurations by hand.*apps\/my-app\/webpack\.config\.js/s
            ),
          ])
        );
      }
    );

    it('should return next steps for a config that does not use NxAppWebpackPlugin', async () => {
      const config = `module.exports = { output: { path: 'dist/apps/my-app/src' } };\n`;
      addForgeApp();
      tree.write('apps/my-app/webpack.config.js', config);

      const result = await update(tree);

      expect(readWebpackConfig()).toEqual(config);
      expect(result?.nextSteps).toEqual(
        expect.arrayContaining([
          expect.stringContaining('apps/my-app/webpack.config.js'),
        ])
      );
    });

    it('should not change the Webpack config of a project without a Forge manifest', async () => {
      const config = webpackConfig(generatedPluginOptions);
      addProjectConfiguration(tree, 'my-node-app', {
        root: 'apps/my-node-app',
      });
      tree.write('apps/my-node-app/webpack.config.js', config);

      const result = await update(tree);

      expect(tree.read('apps/my-node-app/webpack.config.js', 'utf-8')).toEqual(
        config
      );
      expect(result).toBeUndefined();
    });
  });

  describe('esbuild', () => {
    it('should inline dependencies and write to the bundle folder', async () => {
      addForgeApp({
        build: esbuildTarget(
          {},
          {
            development: {},
            production: { outputPath: 'dist/apps/my-app/src' },
          }
        ),
      });

      await update(tree);

      expect(readProjectConfiguration(tree, 'my-app').targets?.build).toEqual(
        esbuildTarget(
          { outputPath: 'dist/apps/my-app/functions', thirdParty: true },
          {
            development: {},
            production: { outputPath: 'dist/apps/my-app/functions' },
          }
        )
      );
    });

    it('should turn on thirdParty in configurations that turn it off', async () => {
      addForgeApp({
        build: esbuildTarget(
          { thirdParty: false },
          { production: { thirdParty: false } }
        ),
      });

      await update(tree);

      const target = readProjectConfiguration(tree, 'my-app').targets?.build;
      expect(target?.options.thirdParty).toBe(true);
      expect(target?.configurations?.production.thirdParty).toBe(true);
    });

    it('should return next steps for an output path it cannot migrate', async () => {
      addForgeApp({
        build: esbuildTarget({ outputPath: 'dist/apps/my-app/out' }),
      });

      const result = await update(tree);

      expect(
        readProjectConfiguration(tree, 'my-app').targets?.build?.options
          .outputPath
      ).toEqual('dist/apps/my-app/out');
      expect(result?.nextSteps).toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            /by hand.*my-app:build \(apps\/my-app\/project\.json\)/s
          ),
        ])
      );
    });

    it('should return next steps for a target that does not bundle', async () => {
      addForgeApp({
        build: esbuildTarget({}, { production: { bundle: false } }),
      });

      const result = await update(tree);

      expect(
        readProjectConfiguration(tree, 'my-app').targets?.build?.options
          .outputPath
      ).toEqual('dist/apps/my-app/src');
      expect(result?.nextSteps).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/by hand.*my-app:build/s),
        ])
      );
    });

    it('should only migrate the build target and report a build it does not recognize', async () => {
      const tool = esbuildTarget({ outputPath: 'dist/tool/src' });
      addForgeApp({
        build: { executor: 'nx:run-commands', options: { command: 'make' } },
        'build-tool': tool,
      });

      const result = await update(tree);

      expect(
        readProjectConfiguration(tree, 'my-app').targets?.['build-tool']
      ).toEqual(tool);
      expect(result?.nextSteps).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/by hand.*my-app:build \(apps\/my-app\)/s),
        ])
      );
    });

    it.each([
      [{ production: { format: ['esm'] } }],
      [
        {
          production: {
            esbuildOptions: { outfile: 'dist/apps/my-app/src/index.js' },
          },
        },
      ],
      [{ production: { esbuildOptions: { outdir: 'dist/apps/my-app/src' } } }],
    ])(
      'should return next steps for a target whose output it cannot move (%#)',
      async (configurations) => {
        addForgeApp({ build: esbuildTarget({}, configurations) });

        const result = await update(tree);

        expect(
          readProjectConfiguration(tree, 'my-app').targets?.build?.options
            .outputPath
        ).toEqual('dist/apps/my-app/src');
        expect(result?.nextSteps).toEqual(
          expect.arrayContaining([
            expect.stringMatching(/by hand.*my-app:build/s),
          ])
        );
      }
    );

    it('should migrate a root project', async () => {
      addForgeApp({ build: esbuildTarget({ outputPath: 'dist/src' }) }, '.');

      await update(tree);

      expect(
        readProjectConfiguration(tree, 'my-app').targets?.build?.options
          .outputPath
      ).toEqual('dist/functions');
    });
  });

  it('should return next steps for hand-written references to the old output folder', async () => {
    addForgeApp({ build: esbuildTarget({}) });

    const result = await update(tree);

    expect(result?.nextSteps).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /dist\/apps\/my-app\/src.*dist\/apps\/my-app\/functions/s
        ),
        expect.stringContaining('Forge CLI 15.1.0'),
      ])
    );
  });
});
