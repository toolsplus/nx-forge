import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { releasePublish, releaseVersion } from 'nx/release';

const PROJECT_NAME = 'nx-forge';
const PACKAGE_NAME = '@toolsplus/nx-forge';
const LOCAL_DIST_TAG = 'latest';
const LOCAL_PREID = 'local';
const LOCAL_REGISTRY_URL = 'http://localhost:4873';

type CliOptions = {
  dryRun: boolean;
  help: boolean;
  version?: string;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  configurePackageManagerCache();
  runPnpmCommand(['nx', 'build', PROJECT_NAME]);

  if (!options.dryRun) {
    await assertLocalRegistryIsReachable();
  }

  const version = options.version ?? (await resolveUniqueLocalVersion());
  console.log(
    `\nPreparing ${PACKAGE_NAME}@${version} for ${LOCAL_REGISTRY_URL} with tag "${LOCAL_DIST_TAG}"${options.dryRun ? ' [dry-run]' : ''}`
  );

  const versionResult = await releaseVersion({
    specifier: version,
    projects: [PROJECT_NAME],
    dryRun: options.dryRun,
    firstRelease: true,
    stageChanges: false,
    gitCommit: false,
    gitTag: false,
    versionActionsOptionsOverrides: {
      skipLockFileUpdate: true,
    },
  });

  const publishedVersion = versionResult.projectsVersionData[PROJECT_NAME]?.newVersion;

  if (!publishedVersion) {
    throw new Error(`Nx did not return a version for project "${PROJECT_NAME}".`);
  }

  const publishResults = await releasePublish({
    projects: [PROJECT_NAME],
    registry: LOCAL_REGISTRY_URL,
    tag: LOCAL_DIST_TAG,
    dryRun: options.dryRun,
    firstRelease: true,
  });

  assertPublishSucceeded(publishResults);

  console.log(`\nPublished ${PACKAGE_NAME}@${publishedVersion}`);
  console.log(`Install it in a consumer workspace with: pnpm add ${PACKAGE_NAME}@${LOCAL_DIST_TAG}`);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--version') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Expected a version after "--version".');
      }
      options.version = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Publish the local nx-forge build to Verdaccio.

Usage:
  pnpm publish:local [-- --dry-run] [-- --version <exact-semver>]

Examples:
  pnpm publish:local
  pnpm publish:local -- --dry-run
  pnpm publish:local -- --version 7.0.2-local.20260405153000
`);
}

async function assertLocalRegistryIsReachable() {
  let response: Response;

  try {
    response = await fetch(LOCAL_REGISTRY_URL);
  } catch (error) {
    throw new Error(
      `Local registry is not reachable at ${LOCAL_REGISTRY_URL}. Start it with "pnpm nx local-registry --location project" and keep it running in another terminal.`,
      { cause: error }
    );
  }

  if (!response.ok) {
    throw new Error(
      `Local registry responded with ${response.status} ${response.statusText}. Restart it with "pnpm nx local-registry" before publishing again.`
    );
  }
}

async function resolveUniqueLocalVersion() {
  const versionResult = await releaseVersion({
    specifier: 'prerelease',
    preid: LOCAL_PREID,
    projects: [PROJECT_NAME],
    dryRun: true,
    firstRelease: true,
    stageChanges: false,
    gitCommit: false,
    gitTag: false,
    versionActionsOptionsOverrides: {
      skipLockFileUpdate: true,
    },
  });

  const suggestedVersion = versionResult.projectsVersionData[PROJECT_NAME]?.newVersion;

  if (!suggestedVersion) {
    throw new Error(`Could not derive a local prerelease version for "${PROJECT_NAME}".`);
  }

  return addUniqueLocalSuffix(suggestedVersion);
}

function addUniqueLocalSuffix(version: string) {
  const timestamp = formatTimestamp(new Date());
  const localVersionPattern = new RegExp(`-${LOCAL_PREID}\\.\\d+$`);

  if (localVersionPattern.test(version)) {
    return version.replace(localVersionPattern, `-${LOCAL_PREID}.${timestamp}`);
  }

  if (version.includes('-')) {
    return `${version}.${timestamp}`;
  }

  return `${version}-${LOCAL_PREID}.${timestamp}`;
}

function formatTimestamp(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  const second = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hour}${minute}${second}`;
}

function configurePackageManagerCache() {
  const cacheDirectory = resolve(process.cwd(), 'tmp', 'local-publish', 'npm-cache');
  mkdirSync(cacheDirectory, { recursive: true });
  process.env.npm_config_cache = cacheDirectory;
  process.env.NPM_CONFIG_CACHE = cacheDirectory;
}

function runPnpmCommand(args: string[]) {
  const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

  execFileSync(pnpmCommand, args, {
    stdio: 'inherit',
  });
}

function assertPublishSucceeded(results: Record<string, { code: number }>) {
  const failedProjects = Object.entries(results).filter(([, result]) => result.code !== 0);

  if (failedProjects.length === 0) {
    return;
  }

  const failedProjectNames = failedProjects.map(([projectName]) => projectName).join(', ');
  throw new Error(`Local publish failed for: ${failedProjectNames}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
