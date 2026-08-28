export interface DeployExecutorOptions {
  outputPath: string;
  environment: string;
  verify: boolean;
  interactive: boolean;
  verbose: boolean;
  approve?: string[];
  majorVersion?: number;
  manifestTransform?: string;
}
