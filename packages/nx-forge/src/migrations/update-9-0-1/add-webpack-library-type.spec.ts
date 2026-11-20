import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { addProjectConfiguration, Tree } from '@nx/devkit';

import update from './add-webpack-library-type';

const plugins = `  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      outputPath: '../../dist/apps/my-app/src',
      main: './src/index.ts',
      outputFileName: 'index.js',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      deleteOutputPath: false,
    }),
  ],
`;

const webpackConfig = (output: string) =>
  `const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');

module.exports = {
${output}${plugins}};
`;

const generatedOutput = `  output: {
    filename: 'index.js',
  },
`;

const migratedOutput = `  output: {
    // Forge loads function handlers from the exports of index.js, so the
    // bundle must assign the entry module's exports to \`module.exports\`.
    library: { type: 'commonjs2' },
    filename: 'index.js',
  },
`;

describe('9.0.1 migration (add webpack library type)', () => {
  let tree: Tree;

  const addForgeApp = (root: string, config: string) => {
    addProjectConfiguration(tree, root.split('/').pop() ?? root, { root });
    tree.write(`${root}/manifest.yml`, 'modules: {}\n');
    tree.write(`${root}/webpack.config.js`, config);
  };

  const readConfig = (root: string) =>
    tree.read(`${root}/webpack.config.js`, 'utf-8');

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ formatter: 'prettier' });
  });

  it('should set the library type in a generated Webpack config', async () => {
    addForgeApp('apps/my-app', webpackConfig(generatedOutput));

    const result = await update(tree);

    expect(readConfig('apps/my-app')).toEqual(webpackConfig(migratedOutput));
    expect(result).toBeUndefined();
  });

  it('should set the library type in a single-line output object', async () => {
    addForgeApp(
      'apps/my-app',
      webpackConfig(`  output: { filename: 'index.js' },\n`)
    );

    await update(tree);

    expect(readConfig('apps/my-app')).toEqual(
      webpackConfig(
        `  output: { library: { type: 'commonjs2' }, filename: 'index.js' },\n`
      )
    );
  });

  it.each([
    `  output: {\n    filename: 'index.js',\n    library: { type: 'commonjs-static' },\n  },\n`,
    `  output: {\n    filename: 'index.js',\n    libraryTarget: 'commonjs2',\n  },\n`,
  ])('should not change a config that sets a library type', async (output) => {
    const config = webpackConfig(output);
    addForgeApp('apps/my-app', config);

    await update(tree);

    expect(readConfig('apps/my-app')).toEqual(config);
  });

  it('should set the library type in a config that only mentions it in a comment', async () => {
    const output = `  output: {\n    // library: { type: 'commonjs2' },\n    filename: 'index.js',\n  },\n`;
    addForgeApp('apps/my-app', webpackConfig(output));

    await update(tree);

    expect(readConfig('apps/my-app')).toContain(
      `    library: { type: 'commonjs2' },\n    // library: { type: 'commonjs2' },`
    );
  });

  it('should return next steps for a config that only mentions an output object in a string', async () => {
    const config = webpackConfig(`  name: 'output: {',\n`);
    addForgeApp('apps/my-app', config);

    const result = await update(tree);

    expect(readConfig('apps/my-app')).toEqual(config);
    expect(result?.nextSteps).toEqual([
      expect.stringContaining('apps/my-app/webpack.config.js'),
    ]);
  });

  it('should not change a config that does not use NxAppWebpackPlugin', async () => {
    const config = `module.exports = {\n  output: {\n    filename: 'index.js',\n  },\n};\n`;
    addForgeApp('apps/my-app', config);

    await update(tree);

    expect(readConfig('apps/my-app')).toEqual(config);
  });

  it('should not change the Webpack config of a project without a Forge manifest', async () => {
    const config = webpackConfig(generatedOutput);
    addProjectConfiguration(tree, 'my-node-app', { root: 'apps/my-node-app' });
    tree.write('apps/my-node-app/webpack.config.js', config);

    await update(tree);

    expect(readConfig('apps/my-node-app')).toEqual(config);
  });

  it('should return next steps for a config without an output object', async () => {
    const config = webpackConfig('');
    addForgeApp('apps/my-app', config);

    const result = await update(tree);

    expect(readConfig('apps/my-app')).toEqual(config);
    expect(result?.nextSteps).toEqual([
      expect.stringContaining('apps/my-app/webpack.config.js'),
    ]);
  });
});
