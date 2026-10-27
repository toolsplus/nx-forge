import {
  formatFiles,
  getProjects,
  joinPathFragments,
  NxJsonConfiguration,
  ProjectConfiguration,
  readJson,
  readNxJson,
  Tree,
  updateNxJson,
  writeJson,
} from '@nx/devkit';

const COLLECTION = '@toolsplus/nx-forge';
const GENERATOR_NAMES = ['application', 'app'];
const FLAT_GENERATOR_KEYS = GENERATOR_NAMES.map(
  (name) => `${COLLECTION}:${name}`
);
const REMOVED = 'setParserOptionsProject';
const REPLACEMENT = 'enableTypedLinting';

/**
 * Generator defaults keyed either by flat generator name
 * (`@toolsplus/nx-forge:application`) or by collection
 * (`{ "@toolsplus/nx-forge": { "application": {} } }`). `nx.json` and
 * `project.json` share this shape.
 */
type Generators = NonNullable<NxJsonConfiguration['generators']>;
type GeneratorDefaults = Generators[string];

const applicationGeneratorDefaults = (generators: Generators): unknown[] => [
  ...FLAT_GENERATOR_KEYS.map((key) => generators[key]),
  ...GENERATOR_NAMES.map((name) => generators[COLLECTION]?.[name]),
];

const isRecord = (value: unknown): value is GeneratorDefaults =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasRemovedOption = (defaults: unknown): defaults is GeneratorDefaults =>
  isRecord(defaults) && REMOVED in defaults;

const usesRemovedOption = (generators: Generators): boolean =>
  applicationGeneratorDefaults(generators).some(hasRemovedOption);

const renameOption = (defaults: GeneratorDefaults): GeneratorDefaults => {
  if (!hasRemovedOption(defaults)) {
    return defaults;
  }
  const { [REMOVED]: removedValue, ...rest } = defaults;
  return { ...rest, [REPLACEMENT]: removedValue };
};

const renameOptionInEntries = (
  entries: Generators,
  keys: string[]
): Generators =>
  Object.fromEntries(
    Object.entries(entries).map(([key, value]) => [
      key,
      keys.includes(key) ? renameOption(value) : value,
    ])
  );

const migrateGenerators = (generators: Generators): Generators => {
  const migrated = renameOptionInEntries(generators, FLAT_GENERATOR_KEYS);
  const nested = migrated[COLLECTION];
  return isRecord(nested)
    ? {
        ...migrated,
        [COLLECTION]: renameOptionInEntries(nested, GENERATOR_NAMES),
      }
    : migrated;
};

/**
 * `nx.json`, a `project.json`, or the `nx` key of a project's `package.json`.
 */
interface GeneratorsOwner {
  generators?: Generators;
}

interface PackageJsonWithNx {
  nx?: GeneratorsOwner;
}

/**
 * Returns the owner with the option renamed, or `undefined` when its
 * application generator defaults do not use the removed option.
 */
const migrateOwner = <T extends GeneratorsOwner>(owner: T): T | undefined =>
  owner.generators && usesRemovedOption(owner.generators)
    ? { ...owner, generators: migrateGenerators(owner.generators) }
    : undefined;

const migrateProjectJson = (tree: Tree, path: string): void => {
  const migrated = migrateOwner(readJson<ProjectConfiguration>(tree, path));
  if (migrated) {
    writeJson(tree, path, migrated);
  }
};

const migratePackageJson = (tree: Tree, path: string): void => {
  const packageJson = readJson<PackageJsonWithNx>(tree, path);
  const migratedNx = packageJson.nx && migrateOwner(packageJson.nx);
  if (migratedNx) {
    writeJson(tree, path, { ...packageJson, nx: migratedNx });
  }
};

/**
 * Nx 24 replaced the `setParserOptionsProject` generator option with
 * `enableTypedLinting`. Rename it in the application generator defaults so
 * that schema validation keeps accepting them and typed linting resolves as
 * before. Each file is renamed in place, which keeps the precedence of
 * `nx.json`, `package.json` and `project.json` defaults unchanged.
 */
export default async function update(tree: Tree) {
  const nxJson = readNxJson(tree);
  const migratedNxJson = nxJson && migrateOwner(nxJson);
  if (migratedNxJson) {
    updateNxJson(tree, migratedNxJson);
  }

  Array.from(getProjects(tree).values()).forEach(({ root }) => {
    const projectJsonPath = joinPathFragments(root, 'project.json');
    const packageJsonPath = joinPathFragments(root, 'package.json');
    if (tree.exists(projectJsonPath)) {
      migrateProjectJson(tree, projectJsonPath);
    }
    if (tree.exists(packageJsonPath)) {
      migratePackageJson(tree, packageJsonPath);
    }
  });

  await formatFiles(tree);
}
