export interface BuildExecutorOptions {
  customUIPath?: string;
  outputPath: string;
  watch: boolean;
  sourceMap?: boolean | 'hidden';
  webpackConfig?: string;
  resourceOutputPathMap?: Record<string, string>;
}

export interface NormalizedOptions extends BuildExecutorOptions {
  root: string;
  sourceRoot: string;
  projectRoot: string;
  customUIPath: string;
  outputPath: string;
  outputFileName: string;
  resourceOutputPathMap: Record<string, string>;
}
