export interface InstallExecutorOptions {
  outputPath: string;
  site: string;
  product: 'jira' | 'confluence' | 'compass';
  environment: string;
  upgrade: boolean;
  confirmScopes: boolean;
  interactive: boolean;
  verbose: boolean;
}
