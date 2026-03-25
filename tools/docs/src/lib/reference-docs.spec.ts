import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import {
  injectReferenceOptions,
  loadReferenceItems,
  parseOptionMarkers,
  renderOptionsMarkdown,
  validateReferenceDocs,
} from './reference-docs';

describe('reference docs utilities', () => {
  const workspaceRoot = resolve(__dirname, '../../../../');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('parses valid option markers', () => {
    expect(
      parseOptionMarkers(
        [
          '## Application',
          '',
          '<!-- nx-forge:options generator=application -->',
        ].join('\n'),
        'docs/reference/generators.md'
      )
    ).toEqual([
      {
        filePath: 'docs/reference/generators.md',
        kind: 'generator',
        name: 'application',
        raw: '<!-- nx-forge:options generator=application -->',
      },
    ]);
  });

  it('fails on malformed option markers', () => {
    expect(() =>
      parseOptionMarkers(
        '<!-- nx-forge:options application -->',
        'docs/reference/generators.md'
      )
    ).toThrow(
      'Malformed nx-forge:options marker in docs/reference/generators.md'
    );
  });

  it('renders generator options from schema metadata', () => {
    const applicationItem = loadReferenceItems(workspaceRoot).find(
      (item) => item.kind === 'generator' && item.name === 'application'
    );

    expect(applicationItem).toBeDefined();

    const markdown = renderOptionsMarkdown(applicationItem!);

    expect(markdown).toContain('| Option | Type | Description | Default |');
    expect(markdown).toContain('`--directory`');
    expect(markdown).toContain('`--dir`');
    expect(markdown).toContain('`string` **[required]**');
    expect(markdown).toContain('Pattern: `^[a-zA-Z][^:]*$`');
    expect(markdown).toContain(
      'Deprecated: Use --swcJest instead for faster compilation'
    );
    expect(markdown).not.toContain('skipFormat');
    expect(markdown).not.toContain('skipPackageJson');
    expect(markdown).not.toContain('rootProject');
  });

  it('renders executor options and excludes hidden options', () => {
    const items = loadReferenceItems(workspaceRoot);
    const packageItem = items.find(
      (item) => item.kind === 'executor' && item.name === 'package'
    );
    const registerItem = items.find(
      (item) => item.kind === 'executor' && item.name === 'register'
    );
    const tunnelItem = items.find(
      (item) => item.kind === 'executor' && item.name === 'tunnel'
    );

    expect(packageItem).toBeDefined();
    expect(registerItem).toBeDefined();
    expect(tunnelItem).toBeDefined();

    const packageMarkdown = renderOptionsMarkdown(packageItem!);
    const registerMarkdown = renderOptionsMarkdown(registerItem!);
    const tunnelMarkdown = renderOptionsMarkdown(tunnelItem!);

    expect(packageMarkdown).toContain('| `boolean` |');
    expect(packageMarkdown).toContain(
      'Enables UI Kit compatible packaging (experimental).'
    );
    expect(registerMarkdown).toContain('`--developerSpaceId`');
    expect(registerMarkdown).toContain('`-s`');
    expect(registerMarkdown).not.toContain('outputPath');
    expect(tunnelMarkdown).not.toContain('preTunnelTimeout');
  });

  it('injects generated options into the reference pages', () => {
    const generatorsPath = join(workspaceRoot, 'docs/reference/generators.md');
    const executorsPath = join(workspaceRoot, 'docs/reference/executors.md');

    const injectedGenerators = injectReferenceOptions(
      readFileSync(generatorsPath, 'utf8'),
      generatorsPath,
      workspaceRoot
    );
    const injectedExecutors = injectReferenceOptions(
      readFileSync(executorsPath, 'utf8'),
      executorsPath,
      workspaceRoot
    );

    expect(injectedGenerators).not.toContain('nx-forge:options');
    expect(injectedExecutors).not.toContain('nx-forge:options');
    expect(injectedGenerators).toContain('| Option | Type | Description | Default |');
    expect(injectedGenerators).toContain(
      'Pattern: `^[a-zA-Z][^:]*$`'
    );
    expect(injectedExecutors).toContain('`--developerSpaceId`');
    expect(injectedExecutors).toContain(
      'Enables UI Kit compatible packaging (experimental).'
    );
  });

  it('validates the current workspace reference docs', () => {
    expect(() => validateReferenceDocs(workspaceRoot)).not.toThrow();
  });

  it('fails validation when a public schema-backed item is missing a marker', () => {
    const tempWorkspace = mkdtempSync(join(tmpdir(), 'nx-forge-reference-docs-'));

    try {
      mkdirSync(join(tempWorkspace, 'packages/nx-forge/src/generators/example'), {
        recursive: true,
      });
      mkdirSync(join(tempWorkspace, 'docs/reference'), {
        recursive: true,
      });

      writeFileSync(
        join(tempWorkspace, 'packages/nx-forge/generators.json'),
        JSON.stringify(
          {
            generators: {
              example: {
                schema: './src/generators/example/schema.json',
              },
            },
          },
          null,
          2
        )
      );
      writeFileSync(
        join(tempWorkspace, 'packages/nx-forge/executors.json'),
        JSON.stringify({ executors: {} }, null, 2)
      );
      writeFileSync(
        join(tempWorkspace, 'packages/nx-forge/src/generators/example/schema.json'),
        JSON.stringify(
          {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Example option.',
              },
            },
          },
          null,
          2
        )
      );
      writeFileSync(
        join(tempWorkspace, 'docs/reference/generators.md'),
        '# Generators\n'
      );
      writeFileSync(
        join(tempWorkspace, 'docs/reference/executors.md'),
        '# Executors\n'
      );

      expect(() => validateReferenceDocs(tempWorkspace)).toThrow(
        'Missing reference docs markers for: generator=example'
      );
    } finally {
      rmSync(tempWorkspace, { force: true, recursive: true });
    }
  });

  it('renders both short and long aliases when provided', () => {
    const tempWorkspace = mkdtempSync(join(tmpdir(), 'nx-forge-reference-docs-'));

    try {
      mkdirSync(join(tempWorkspace, 'packages/nx-forge/src/generators/example'), {
        recursive: true,
      });
      mkdirSync(join(tempWorkspace, 'docs/reference'), {
        recursive: true,
      });

      writeFileSync(
        join(tempWorkspace, 'packages/nx-forge/generators.json'),
        JSON.stringify(
          {
            generators: {
              example: {
                schema: './src/generators/example/schema.json',
              },
            },
          },
          null,
          2
        )
      );
      writeFileSync(
        join(tempWorkspace, 'packages/nx-forge/executors.json'),
        JSON.stringify({ executors: {} }, null, 2)
      );
      writeFileSync(
        join(tempWorkspace, 'packages/nx-forge/src/generators/example/schema.json'),
        JSON.stringify(
          {
            type: 'object',
            properties: {
              target: {
                type: 'string',
                description: 'Example option.',
                alias: 't',
                aliases: ['target-name'],
              },
            },
          },
          null,
          2
        )
      );
      writeFileSync(
        join(tempWorkspace, 'docs/reference/generators.md'),
        '<!-- nx-forge:options generator=example -->\n'
      );
      writeFileSync(
        join(tempWorkspace, 'docs/reference/executors.md'),
        '# Executors\n'
      );

      const exampleItem = loadReferenceItems(tempWorkspace).find(
        (item) => item.kind === 'generator' && item.name === 'example'
      );

      expect(exampleItem).toBeDefined();
      expect(renderOptionsMarkdown(exampleItem!)).toContain(
        '`-t`, `--target-name`'
      );
    } finally {
      rmSync(tempWorkspace, { force: true, recursive: true });
    }
  });
});
