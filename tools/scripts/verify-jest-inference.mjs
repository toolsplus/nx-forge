import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const graphWorkerArgument = '--read-project-graph';

if (process.argv.includes(graphWorkerArgument)) {
  const { createProjectGraphAsync } = await import('@nx/devkit');
  const graph = await createProjectGraphAsync();
  const targets = Object.fromEntries(
    [
      ['nx-forge', 'test'],
      ['docs-tools', 'test'],
      ['nx-forge-e2e', 'e2e'],
    ].map(([projectName, targetName]) => [
      projectName,
      graph.nodes[projectName]?.data.targets?.[targetName],
    ])
  );
  const deprecatedTargets = Object.values(graph.nodes).flatMap(({ data }) =>
    Object.entries(data.targets ?? {})
      .filter(([, target]) => target.executor === '@nx/jest:jest')
      .map(([targetName]) => `${data.name}:${targetName}`)
  );

  process.stdout.write(JSON.stringify({ deprecatedTargets, targets }));
} else {
  const graphResult = spawnSync(process.execPath, [fileURLToPath(import.meta.url), graphWorkerArgument], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      NX_CACHE_PROJECT_GRAPH: 'false',
      NX_DAEMON: 'false',
    },
  });

  assert.equal(
    graphResult.status,
    0,
    `Nx project graph creation failed:\n${graphResult.stderr}`
  );
  assert.doesNotMatch(
    graphResult.stderr,
    /Failed to load the ES module/,
    `Jest config emitted a module-format warning:\n${graphResult.stderr}`
  );

  const { deprecatedTargets, targets } = JSON.parse(graphResult.stdout);
  assert.deepEqual(deprecatedTargets, [], 'Resolved workspace targets still use @nx/jest:jest');

  const expectedTargets = {
    'nx-forge': {
      name: 'test',
      cwd: 'packages/nx-forge',
      output: '{workspaceRoot}/coverage/packages/nx-forge',
    },
    'docs-tools': {
      name: 'test',
      cwd: 'tools/docs',
      output: '{workspaceRoot}/coverage/tools/docs',
    },
    'nx-forge-e2e': {
      name: 'e2e',
      cwd: 'e2e/nx-forge-e2e',
      output: '{workspaceRoot}/coverage/e2e/nx-forge-e2e',
    },
  };

  for (const [projectName, expected] of Object.entries(expectedTargets)) {
    const target = targets[projectName];
    assert.ok(target, `${projectName}:${expected.name} is not available`);
    assert.equal(target.executor, 'nx:run-commands');
    assert.equal(target.cache, true);
    assert.deepEqual(target.outputs, [expected.output]);
    assert.equal(target.options.command, 'jest');
    assert.equal(target.options.cwd, expected.cwd);
    assert.equal(target.options.passWithNoTests, true);
    assert.deepEqual(target.configurations.ci, { ci: true, coverage: true });
    assert.ok(target.inputs.includes('default'));
    assert.ok(target.inputs.includes('^production'));
    assert.ok(target.inputs.includes('{workspaceRoot}/jest.preset.js'));
  }

  process.stdout.write('Verified inferred Jest targets and warning-free config loading.\n');
}
