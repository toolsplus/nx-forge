export interface DeployExecutorOptions {
  outputPath: string;
  environment: string;
  verify: boolean;
  interactive: boolean;
  verbose: boolean;
  manifestTransform?: string;
}
