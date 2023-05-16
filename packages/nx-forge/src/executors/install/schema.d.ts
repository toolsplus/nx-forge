export interface InstallExecutorOptions {
  outputPath: string;
  site: string;
  product: 'jira' | 'confluence' | 'compass';
  environment: 'development' | 'staging' | 'production';
  upgrade: boolean;
  confirmScopes: boolean;
  interactive: boolean;
  verbose: boolean;
}
