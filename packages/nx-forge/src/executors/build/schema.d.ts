export interface BuildExecutorOptions {
  customUIPath?: string;
  outputPath: string;
  watch: boolean;
}

export interface NormalizedOptions extends BuildExecutorOptions {
  root: string;
  sourceRoot: string;
  projectRoot: string;
  customUIPath: string;
  outputPath: string;
  outputFileName: string;
  sourceMap: boolean;
}
