import type { LinterType } from '@nx/eslint';

interface ApplicationGeneratorOptions {
  directory: string;
  name?: string;
  skipFormat?: boolean;
  skipPackageJson?: boolean;
  linter?: LinterType;
  standaloneConfig?: boolean;
  tags?: string;
  bundler?: 'esbuild' | 'webpack';
  unitTestRunner?: 'jest' | 'none';
  swcJest?: boolean;
  /** @deprecated use `swcJest` instead */
  babelJest?: boolean;
  js?: boolean;
  setParserOptionsProject?: boolean;
  rootProject?: boolean;
  addPlugin?: boolean;
}

interface NormalizedOptions extends ApplicationGeneratorOptions {
  name: string;
  addPlugin: boolean;
  appProjectRoot: string;
  linter: LinterType;
  unitTestRunner: 'jest' | 'none';
  parsedTags: string[];
}
