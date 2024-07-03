export interface InstallExecutorOptions {
  outputPath: string;
  site: string;
  product: 'jira' | 'confluence' | 'compass' | 'bitbucket';
  environment: string;
  upgrade: boolean;
  confirmScopes: boolean;
  interactive: boolean;
  verbose: boolean;
}
