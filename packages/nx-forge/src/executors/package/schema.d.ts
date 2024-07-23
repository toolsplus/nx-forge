export interface PackageExecutorSchema {
  outputPath: string;
  resourcePath?: string;
  resourceOutputPathMap?: Record<string, string>;
  tsConfig: string;
  uiKit2Packaging: boolean;
}

export interface NormalizedOptions extends PackageExecutorSchema {
  root: string;
  sourceRoot: string;
  projectRoot: string;
  resourcePath: string;
  outputPath: string;
  tsConfig: string;
  resourceOutputPathMap: Record<string, string>;
}
