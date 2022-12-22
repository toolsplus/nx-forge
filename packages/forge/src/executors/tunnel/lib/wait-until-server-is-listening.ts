import * as net from 'net';
import { ExecutorContext, logger } from '@nrwl/devkit';

/**
 *
 * @param port Port on which the server is listening
 * @param context Executor context for this invocation
 * @see https://github.com/nrwl/nx/blob/cded83b2c5bf3e4252c03d4dbcbb5b203b0faed0/packages/webpack/src/executors/ssr-dev-server/lib/wait-until-server-is-listening.ts
 */
export function waitUntilServerIsListening(
  port: number,
  context: ExecutorContext
): Promise<void> {
  const allowedErrorCodes = ['ECONNREFUSED', 'ECONNRESET'];
  const maxAttempts = 15;
  let attempts = 0;
  const client = new net.Socket();
  const cleanup = () => {
    client.removeAllListeners('connect');
    client.removeAllListeners('error');
    client.end();
    client.destroy();
    client.unref();
  };

  return new Promise<void>((resolve, reject) => {
    const listen = () => {
      client.once('connect', () => {
        cleanup();
        resolve();
      });
      client.on('error', (err) => {
        if (
          attempts > maxAttempts ||
          !allowedErrorCodes.includes(err['code'])
        ) {
          if (context.isVerbose) {
            logger.error(
              `Could not wait for server to start on port ${port}: ${
                attempts > maxAttempts
                  ? `Max attempts (${maxAttempts}) exceeded`
                  : `Server returned unexpected error code ${err['code']}`
              }`
            );
          }
          cleanup();
          reject(err);
        } else {
          attempts++;
          setTimeout(listen, 1000 * attempts);
        }
      });
      client.connect({ port, host: 'localhost' });
    };
    listen();
  });
}
