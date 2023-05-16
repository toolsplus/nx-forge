export interface DeployExecutorOptions {
  outputPath: string;
  environment: 'development' | 'staging' | 'production';
  verify: boolean;
  interactive: boolean;
  verbose: boolean;
}
