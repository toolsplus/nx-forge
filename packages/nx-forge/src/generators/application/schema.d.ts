import type { Linter } from '@nx/eslint';
import { ProjectNameAndRootFormat } from '@nx/devkit/src/generators/project-name-and-root-utils';

interface ApplicationGeneratorOptions {
  name: string;
  directory?: string;
  projectNameAndRootFormat?: ProjectNameAndRootFormat;
  skipFormat?: boolean;
  linter?: Linter;
  standaloneConfig?: boolean;
  tags?: string;
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
