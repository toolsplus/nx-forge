export interface ApplicationGeneratorOptions {
  directory: string;
  name?: string;
  skipFormat?: boolean;
  skipPackageJson?: boolean;
  linter?: 'eslint' | 'none';
  tags?: string;
  bundler?: 'esbuild' | 'webpack';
  unitTestRunner?: 'jest' | 'vitest' | 'none';
  swcJest?: boolean;
  /** @deprecated use `swcJest` instead */
  babelJest?: boolean;
  js?: boolean;
  enableTypedLinting?: boolean;
  rootProject?: boolean;
}

export interface NormalizedOptions extends ApplicationGeneratorOptions {
  name: string;
  appProjectRoot: string;
  /** Workspace-relative directory that the Forge app is packaged into. */
  outputPath: string;
  bundler: 'esbuild' | 'webpack';
  linter: 'eslint' | 'none';
  unitTestRunner: 'jest' | 'vitest' | 'none';
  rootProject: boolean;
  parsedTags: string[];
}
