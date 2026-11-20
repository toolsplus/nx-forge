import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dump, load } from 'js-yaml';

export const WEB_TRIGGER_KEY = 'e2e-web-trigger';
export const WEB_TRIGGER_RESPONSE_BODY = 'nx-forge e2e web trigger';

const WEB_TRIGGER_FUNCTION_KEY = 'web-trigger-handler';
const WEB_TRIGGER_HANDLER = 'webTrigger';

const INVOKE_RETRY_INTERVAL_MS = 5_000;
const INVOKE_ATTEMPTS = 6;

interface Manifest {
  modules?: Record<string, unknown[]>;
  [key: string]: unknown;
}

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Adds a web trigger and the function that handles it to a generated Forge
 * app, so that tests can invoke a function of the deployed app over HTTP.
 *
 * @param projectRoot Absolute path of the Forge app project
 */
export const addWebTrigger = (projectRoot: string): void => {
  const manifestPath = join(projectRoot, 'manifest.yml');
  const manifest = load(readFileSync(manifestPath, 'utf8')) as Manifest;
  const modules = manifest.modules ?? {};
  const updatedManifest: Manifest = {
    ...manifest,
    modules: {
      ...modules,
      webtrigger: [
        ...(modules.webtrigger ?? []),
        {
          key: WEB_TRIGGER_KEY,
          function: WEB_TRIGGER_FUNCTION_KEY,
          response: { type: 'dynamic' },
        },
      ],
      function: [
        ...(modules.function ?? []),
        {
          key: WEB_TRIGGER_FUNCTION_KEY,
          handler: `index.${WEB_TRIGGER_HANDLER}`,
        },
      ],
    },
  };
  writeFileSync(manifestPath, dump(updatedManifest), 'utf8');

  appendFileSync(
    join(projectRoot, 'src', 'index.ts'),
    `
export const ${WEB_TRIGGER_HANDLER} = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': ['text/plain'] },
  body: '${WEB_TRIGGER_RESPONSE_BODY}',
});
`,
    'utf8'
  );
};

/**
 * Extracts the web trigger URL from the output of `forge webtrigger create`.
 */
export const parseWebTriggerUrl = (stdout: string): string | undefined =>
  stdout.match(/https:\/\/\S+\.atlassian-dev\.net\/\S+/)?.[0];

export interface WebTriggerResponse {
  status: number;
  body: string;
}

const requestWebTrigger = async (url: string): Promise<WebTriggerResponse> => {
  const response = await fetch(url, { method: 'POST' });
  return { status: response.status, body: await response.text() };
};

/**
 * Invokes the web trigger and retries for a short, bounded window while the
 * invocation fails, because a new installation can take a moment to accept
 * invocations. Network errors are retried too, and the last one is rethrown.
 */
export const invokeWebTrigger = async (
  url: string,
  attempt = 1
): Promise<WebTriggerResponse> => {
  try {
    const result = await requestWebTrigger(url);
    if (result.status === 200 || attempt >= INVOKE_ATTEMPTS) {
      return result;
    }
  } catch (error) {
    if (attempt >= INVOKE_ATTEMPTS) {
      throw error;
    }
  }
  await sleep(INVOKE_RETRY_INTERVAL_MS);
  return invokeWebTrigger(url, attempt + 1);
};
