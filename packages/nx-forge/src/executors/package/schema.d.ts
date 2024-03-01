export interface PackageExecutorSchema {
  outputPath: string;
  resourcePath?: string;
}

export interface NormalizedOptions extends PackageExecutorSchema {
  root: string;
  sourceRoot: string;
  projectRoot: string;
  resourcePath: string;
  outputPath: string;
}
