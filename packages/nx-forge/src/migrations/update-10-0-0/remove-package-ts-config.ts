import {
  formatFiles,
  getProjects,
  joinPathFragments,
  readNxJson,
  TargetConfiguration,
  Tree,
  updateNxJson,
  updateProjectConfiguration,
} from '@nx/devkit';

const PACKAGE_EXECUTOR = '@toolsplus/nx-forge:package';
const PACKAGE_TARGET = 'package';
const REMOVED = 'tsConfig';

type Options = Record<string, unknown>;

const withoutRemovedOption = <T extends Options | undefined>(options: T): T => {
  if (options === undefined || !(REMOVED in options)) {
    return options;
  }
  return Object.fromEntries(
    Object.entries(options).filter(([key]) => key !== REMOVED)
  ) as T;
};

const removeOption = (target: TargetConfiguration): TargetConfiguration => ({
  ...target,
  ...(target.options && { options: withoutRemovedOption(target.options) }),
  ...(target.configurations && {
    configurations: Object.fromEntries(
      Object.entries(target.configurations).map(([name, options]) => [
        name,
        withoutRemovedOption(options),
      ])
    ),
  }),
});

const usesRemovedOption = (target: TargetConfiguration): boolean =>
  [target.options, ...Object.values(target.configurations ?? {})].some(
    (options) => options !== undefined && REMOVED in options
  );

/**
 * The inferred `package` target can be configured in `project.json` without
 * naming its executor.
 */
const isPackageTarget = (name: string, target: TargetConfiguration): boolean =>
  target.executor === PACKAGE_EXECUTOR ||
  (name === PACKAGE_TARGET && target.executor === undefined);

const isForgeProject = (tree: Tree, root: string): boolean =>
  tree.exists(joinPathFragments(root, 'manifest.yml'));

const migrateTargets = (
  targets: Record<string, TargetConfiguration>
): Record<string, TargetConfiguration> =>
  Object.fromEntries(
    Object.entries(targets).map(([name, target]) => [
      name,
      isPackageTarget(name, target) ? removeOption(target) : target,
    ])
  );

const hasTargetToMigrate = (
  targets: Record<string, TargetConfiguration>
): boolean =>
  Object.entries(targets).some(
    ([name, target]) =>
      isPackageTarget(name, target) && usesRemovedOption(target)
  );

const migrateProjects = (tree: Tree): void =>
  Array.from(getProjects(tree).entries())
    .filter(([, project]) => isForgeProject(tree, project.root))
    .filter(([, project]) => hasTargetToMigrate(project.targets ?? {}))
    .forEach(([name, project]) =>
      updateProjectConfiguration(tree, name, {
        ...project,
        targets: migrateTargets(project.targets ?? {}),
      })
    );

type TargetDefault = Partial<TargetConfiguration> & {
  filter?: { executor?: string };
};

const isPackageTargetDefault = (key: string, target: TargetDefault): boolean =>
  key === PACKAGE_EXECUTOR ||
  target.executor === PACKAGE_EXECUTOR ||
  target.filter?.executor === PACKAGE_EXECUTOR;

/**
 * A target default is either a configuration or a list of filtered
 * configurations.
 */
const targetDefaultEntries = (
  value: TargetDefault | TargetDefault[]
): TargetDefault[] => (Array.isArray(value) ? value : [value]);

const migrateTargetDefaults = (tree: Tree): void => {
  const nxJson = readNxJson(tree);
  const targetDefaults = nxJson?.targetDefaults;
  const needsMigration = Object.entries(targetDefaults ?? {}).some(
    ([key, value]) =>
      targetDefaultEntries(value).some(
        (entry) =>
          isPackageTargetDefault(key, entry) &&
          usesRemovedOption(entry as TargetConfiguration)
      )
  );
  if (!nxJson || !targetDefaults || !needsMigration) {
    return;
  }

  const migrateEntry = <T extends TargetDefault>(key: string, entry: T): T =>
    isPackageTargetDefault(key, entry)
      ? (removeOption(entry as TargetConfiguration) as T)
      : entry;

  updateNxJson(tree, {
    ...nxJson,
    targetDefaults: Object.fromEntries(
      Object.entries(targetDefaults).map(([key, value]) => [
        key,
        Array.isArray(value)
          ? value.map((entry) => migrateEntry(key, entry))
          : migrateEntry(key, value),
      ])
    ),
  });
};

/**
 * The package executor no longer generates a `package.json`, so it dropped
 * the `tsConfig` option that only served that. Remove the option from the
 * package targets of Forge apps and from target defaults.
 *
 * @see https://github.com/toolsplus/nx-forge/issues/222
 */
export default async function update(tree: Tree): Promise<void> {
  migrateProjects(tree);
  migrateTargetDefaults(tree);
  await formatFiles(tree);
}
