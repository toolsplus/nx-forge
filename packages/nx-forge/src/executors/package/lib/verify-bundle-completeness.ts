import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { Node, Options, parse } from 'acorn';
import { ancestor } from 'acorn-walk';

export interface MissingModule {
  /** Bundle file that loads the module, relative to the bundle folder. */
  readonly file: string;
  /** Module specifier as it appears in the bundle. */
  readonly module: string;
}

const BUNDLE_FILE_EXTENSIONS = ['.js', '.cjs'];

/**
 * Extensions and index files that Node tries when it resolves a relative
 * `require`.
 */
const RELATIVE_RESOLUTION_SUFFIXES = [
  '',
  '.js',
  '.json',
  '.node',
  `${sep}index.js`,
  `${sep}index.json`,
  `${sep}index.node`,
];

const PARSE_OPTIONS: Options = {
  ecmaVersion: 'latest',
  allowHashBang: true,
  allowReturnOutsideFunction: true,
  allowAwaitOutsideFunction: true,
};

const listBundleFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return listBundleFiles(path);
      }
      return BUNDLE_FILE_EXTENSIONS.includes(extname(entry.name)) ? [path] : [];
    });

const parseBundleFile = (code: string, file: string): Node => {
  try {
    return parse(code, { ...PARSE_OPTIONS, sourceType: 'script' });
  } catch {
    try {
      return parse(code, { ...PARSE_OPTIONS, sourceType: 'module' });
    } catch (error) {
      throw new Error(
        `Failed to parse bundle file ${file}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

type AnyNode = Node & Record<string, unknown>;

const isIdentifier = (node: unknown, name: string): boolean =>
  (node as AnyNode | undefined)?.type === 'Identifier' &&
  (node as AnyNode).name === name;

const isStringLiteral = (node: unknown): node is { value: string } =>
  (node as AnyNode | undefined)?.type === 'Literal' &&
  typeof (node as AnyNode).value === 'string';

const declaresRequire = (statement: AnyNode): boolean =>
  (statement.type === 'FunctionDeclaration' &&
    isIdentifier(statement.id, 'require')) ||
  (statement.type === 'VariableDeclaration' &&
    (statement.declarations as AnyNode[]).some((declarator) =>
      isIdentifier(declarator.id, 'require')
    ));

/**
 * Whether an enclosing function shadows the global `require`, as in the
 * module wrappers of libraries that were bundled before they were published.
 */
const isRequireShadowed = (ancestors: AnyNode[]): boolean =>
  ancestors.some((node) => {
    if (
      node.type !== 'FunctionDeclaration' &&
      node.type !== 'FunctionExpression' &&
      node.type !== 'ArrowFunctionExpression'
    ) {
      return false;
    }
    const params = node.params as AnyNode[];
    const body = node.body as AnyNode;
    return (
      params.some((param) => isIdentifier(param, 'require')) ||
      (body.type === 'BlockStatement' &&
        (body.body as AnyNode[]).some(declaresRequire))
    );
  });

/**
 * Module specifiers that the code loads with a string literal, through the
 * global `require` or a dynamic `import()`.
 */
const findLoadedModules = (code: string, file: string): string[] => {
  const modules: string[] = [];
  ancestor(parseBundleFile(code, file), {
    CallExpression(node, _state, ancestors) {
      const call = node as unknown as AnyNode;
      const [firstArgument] = call.arguments as AnyNode[];
      if (
        isIdentifier(call.callee, 'require') &&
        isStringLiteral(firstArgument) &&
        !isRequireShadowed(ancestors as AnyNode[])
      ) {
        modules.push(firstArgument.value);
      }
    },
    ImportExpression(node) {
      const source = (node as unknown as AnyNode).source;
      if (isStringLiteral(source)) {
        modules.push(source.value);
      }
    },
  });
  return [...new Set(modules)];
};

const isPathSpecifier = (specifier: string): boolean =>
  specifier.startsWith('./') ||
  specifier.startsWith('../') ||
  specifier === '.' ||
  specifier === '..' ||
  specifier.startsWith('/');

const isInDirectory = (path: string, directory: string): boolean => {
  const relativePath = relative(directory, path);
  return (
    relativePath !== '' &&
    !relativePath.startsWith('..') &&
    !relativePath.startsWith(sep)
  );
};

const resolvesToBundleFile = (
  specifier: string,
  requiringFile: string,
  bundlePath: string
): boolean => {
  const target = resolve(dirname(requiringFile), specifier);
  return RELATIVE_RESOLUTION_SUFFIXES.map((suffix) => target + suffix).some(
    (candidate) =>
      isInDirectory(candidate, bundlePath) &&
      existsSync(candidate) &&
      statSync(candidate).isFile()
  );
};

const isAllowedMissing = (
  specifier: string,
  allowMissingModules: string[]
): boolean =>
  allowMissingModules.some(
    (allowed) => specifier === allowed || specifier.startsWith(`${allowed}/`)
  );

/**
 * Finds modules that the bundle loads but that are neither Node built-ins nor
 * files in the bundle folder.
 *
 * @param bundlePath Absolute path of the bundle folder
 * @param allowMissingModules Modules, and their subpaths, that may be absent
 */
export const findMissingModules = (
  bundlePath: string,
  allowMissingModules: string[]
): MissingModule[] =>
  listBundleFiles(bundlePath).flatMap((filePath) =>
    findLoadedModules(readFileSync(filePath, 'utf8'), filePath)
      .filter(
        (specifier) =>
          !isBuiltin(specifier) &&
          !isAllowedMissing(specifier, allowMissingModules) &&
          !(
            isPathSpecifier(specifier) &&
            resolvesToBundleFile(specifier, filePath, bundlePath)
          )
      )
      .map((module) => ({
        file: relative(bundlePath, filePath).split(sep).join('/'),
        module,
      }))
  );

/**
 * Fails if the bundle folder holds no bundle, or if the bundle loads a module
 * that is neither a Node built-in nor a file in the bundle folder. Forge ships
 * the bundle as it is, so such a module would be missing at runtime.
 *
 * @param bundlePath Absolute path of the bundle folder
 * @param allowMissingModules Modules, and their subpaths, that may be absent
 */
export const verifyBundleCompleteness = (
  bundlePath: string,
  allowMissingModules: string[]
): void => {
  if (!existsSync(join(bundlePath, 'index.js'))) {
    throw new Error(
      `No bundle found in ${bundlePath}. Build the app before packaging it.`
    );
  }

  const missingModules = findMissingModules(bundlePath, allowMissingModules);

  if (missingModules.length > 0) {
    throw new Error(
      [
        `The bundle in ${bundlePath} loads modules that are not in it:`,
        '',
        ...missingModules.map(({ file, module }) => `  - ${module} (${file})`),
        '',
        'Forge ships the bundle as it is, so the build must inline all dependencies except Node built-ins.',
        "If the code handles a module's absence itself, add the module to the 'allowMissingModules' option of the package target.",
      ].join('\n')
    );
  }
};
