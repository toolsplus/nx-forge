export interface InstallExecutorOptions {
  outputPath: string;
  site: string;
  product: 'jira' | 'confluence' | 'compass' | 'bitbucket';
  environment: string;
  upgrade: boolean;
  confirmScopes: boolean;
  license?: 'active' | 'inactive' | 'trial';
  interactive: boolean;
  verbose: boolean;
}
