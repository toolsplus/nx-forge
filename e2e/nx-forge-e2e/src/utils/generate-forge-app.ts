import { runNxCommandAsync } from './async-commands';

const uniqueAppName = () =>
  `nx-forge-test-app-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

/**
 * Generates a Forge app with a unique name to avoid clashes between tests running in parallel.
 *
 * The application will be generated in <directory>/<unique-app-name>.
 *
 * @param directory Directory in which to generate the application
 * @param options Options string to pass to the application generator
 * @returns Name of the generated Forge app.
 */
export const generateForgeApp = async ({
  cwd,
  directory,
  options,
}: {
  cwd: string;
  directory: string;
  options?: string;
}): Promise<string> => {
  const appName = uniqueAppName();
  await runNxCommandAsync(
    `generate @toolsplus/nx-forge:application ${directory}/${appName} ${
      options ?? ''
    }`,
    { cwd }
  );
  return appName;
};
