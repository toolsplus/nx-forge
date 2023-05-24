export interface RegisterExecutorOptions {
  outputPath: string;

  appName: string;
  verbose: boolean;
}

export interface NormalizedOptions extends RegisterExecutorOptions {
  root: string;
  sourceRoot: string;
  projectRoot: string;
  outputPath: string;
}
