export interface PackageExecutorSchema {
  outputPath: string;
  resourcePath?: string;
  resourceOutputPathMap?: Record<string, string>;
  allowMissingModules?: string[];
}

export interface NormalizedOptions extends PackageExecutorSchema {
  root: string;
  sourceRoot: string;
  projectRoot: string;
  resourcePath: string;
  outputPath: string;
  resourceOutputPathMap: Record<string, string>;
  allowMissingModules: string[];
}
