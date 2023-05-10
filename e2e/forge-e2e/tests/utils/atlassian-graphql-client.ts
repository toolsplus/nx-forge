import { gql, GraphQLClient } from 'graphql-request';
import { Credentials } from './config';

interface DeleteAppResponse {
  success: boolean;
  errors?: [{ message: string }];
}
export const deleteApp =
  (appId: string) =>
  (client: GraphQLClient): Promise<DeleteAppResponse> =>
    client
      .request<{ deleteApp: DeleteAppResponse }>({
        document: gql`
          mutation deleteApp($input: DeleteAppInput!) {
            deleteApp(input: $input) {
              success
              errors {
                message
              }
            }
          }
        `,
        variables: {
          input: {
            appId,
          },
        },
      })
      .then((r) => r.deleteApp);

export const createClient = ({ email, token }: Credentials) =>
  new GraphQLClient('https://api.atlassian.com/graphql', {
    headers: {
      authorization: `Basic ${Buffer.from(`${email}:${token}`).toString(
        'base64'
      )}`,
    },
  });
