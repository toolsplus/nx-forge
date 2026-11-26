import {
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

type Options = Record<string, unknown>;

type TargetDefault = Partial<TargetConfiguration> & {
  filter?: { executor?: string };
};

const withoutOption = <T extends Options | undefined>(
  options: T,
  option: string
): T => {
  if (options === undefined || !(option in options)) {
    return options;
  }
  return Object.fromEntries(
    Object.entries(options).filter(([key]) => key !== option)
  ) as T;
};

const removeOption = (
  target: TargetConfiguration,
  option: string
): TargetConfiguration => ({
  ...target,
  ...(target.options && { options: withoutOption(target.options, option) }),
  ...(target.configurations && {
    configurations: Object.fromEntries(
      Object.entries(target.configurations).map(([name, options]) => [
        name,
        withoutOption(options, option),
      ])
    ),
  }),
});

const usesOption = (target: TargetConfiguration, option: string): boolean =>
  [target.options, ...Object.values(target.configurations ?? {})].some(
    (options) => options !== undefined && option in options
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

const migrateProjects = (tree: Tree, option: string): void =>
  Array.from(getProjects(tree).entries())
    .filter(([, project]) => isForgeProject(tree, project.root))
    .filter(([, project]) =>
      Object.entries(project.targets ?? {}).some(
        ([name, target]) =>
          isPackageTarget(name, target) && usesOption(target, option)
      )
    )
    .forEach(([name, project]) =>
      updateProjectConfiguration(tree, name, {
        ...project,
        targets: Object.fromEntries(
          Object.entries(project.targets ?? {}).map(([targetName, target]) => [
            targetName,
            isPackageTarget(targetName, target)
              ? removeOption(target, option)
              : target,
          ])
        ),
      })
    );

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

const migrateTargetDefaults = (
  tree: Tree,
  option: string,
  isTargetDefaultToMigrate: (key: string, entry: TargetDefault) => boolean
): void => {
  const nxJson = readNxJson(tree);
  const targetDefaults = nxJson?.targetDefaults;
  const needsMigration = Object.entries(targetDefaults ?? {}).some(
    ([key, value]) =>
      targetDefaultEntries(value).some(
        (entry) =>
          isTargetDefaultToMigrate(key, entry) &&
          usesOption(entry as TargetConfiguration, option)
      )
  );
  if (!nxJson || !targetDefaults || !needsMigration) {
    return;
  }

  const migrateEntry = <T extends TargetDefault>(key: string, entry: T): T =>
    isTargetDefaultToMigrate(key, entry)
      ? (removeOption(entry as TargetConfiguration, option) as T)
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
 * Removes a dropped option of the package executor from the package targets
 * of Forge apps and from the target defaults for the package executor.
 *
 * @param tree Workspace to migrate
 * @param option Name of the dropped option
 * @param fromAllTargetDefaults Also remove the option from target defaults
 *   that do not name the package executor. Only safe for an option that no
 *   other executor has.
 */
export const removePackageOption = (
  tree: Tree,
  option: string,
  { fromAllTargetDefaults = false } = {}
): void => {
  migrateProjects(tree, option);
  migrateTargetDefaults(
    tree,
    option,
    fromAllTargetDefaults ? () => true : isPackageTargetDefault
  );
};
