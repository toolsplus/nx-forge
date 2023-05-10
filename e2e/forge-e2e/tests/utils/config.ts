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
  const email = process.env.FORGE_EMAIL;
  const token = process.env.FORGE_API_TOKEN;
  if (!email || email === '') {
    throw new Error('Missing environment variable FORGE_EMAIL');
  }

  if (!token || token === '') {
    throw new Error('Missing environment variable FORGE_API_TOKEN');
  }

  return {
    email,
    token,
  };
};
