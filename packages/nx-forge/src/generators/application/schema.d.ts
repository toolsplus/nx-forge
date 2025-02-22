import type { Linter } from '@nx/eslint';

interface ApplicationGeneratorOptions {
  directory: string;
  name?: string;
  skipFormat?: boolean;
  skipPackageJson?: boolean;
  linter?: Linter;
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
  addPlugin: boolean;
  appProjectRoot: string;
  linter: Linter;
  unitTestRunner: 'jest' | 'none';
  parsedTags: string[];
}
