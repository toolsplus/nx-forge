export interface ApplicationGeneratorOptions {
  name: string;
  directory?: string;
  skipFormat?: boolean;
  linter?: Exclude<Linter, Linter.TsLint>;
  standaloneConfig?: boolean;
  tags?: string;
  unitTestRunner?: UnitTestRunner;
  babelJest?: boolean;
  js?: boolean;
  setParserOptionsProject?: boolean;
}

interface NormalizedOptions extends ApplicationGeneratorOptions {
  appProjectRoot: string;
  linter: Exclude<Linter, Linter.TsLint>;
  unitTestRunner: UnitTestRunner;
  parsedTags: string[];
}
