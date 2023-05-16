import * as process from 'process';
import { z } from 'zod';

const getEnvironmentVariable = <A>(
  variableKey: string,
  schema: z.Schema<A>
): A => {
  const parseResult = schema.safeParse(process.env[variableKey]);
  if (parseResult.success === false) {
    throw new Error(
      `Missing or unexpected environment variable ${variableKey}: ${parseResult.error.format()}`
    );
  }
  return parseResult.data;
};

export interface Credentials {
  email: string;
  token: string;
}

/**
 * Reads and validates the environment variables to authorize requests to the
 * Atlassian API.
 *
 * @returns Base64 encoded credentials to be used as the authorization header content in API requests
 */
export const getCredentials = () => {
  const email = getEnvironmentVariable('FORGE_EMAIL', z.string().email());
  const token = getEnvironmentVariable(
    'FORGE_API_TOKEN',
    z.string().nonempty()
  );

  return {
    email,
    token,
  };
};

export interface AtlassianProductContext {
  siteUrl: string;
  product: 'jira' | 'confluence' | 'compass';
}

export const getAtlassianProductContext = (): AtlassianProductContext => {
  const siteUrl = getEnvironmentVariable(
    'ATLASSIAN_SITE_URL',
    z.string().regex(/^.*\.atlassian.net$/)
  );
  const product = getEnvironmentVariable(
    'ATLASSIAN_PRODUCT',
    z.union([z.literal('jira'), z.literal('confluence'), z.literal('compass')])
  );

  return {
    siteUrl,
    product,
  };
};
