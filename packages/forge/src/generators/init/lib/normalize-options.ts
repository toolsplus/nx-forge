import type { InitGeneratorSchema } from '../schema';

export function normalizeOptions(
  options: InitGeneratorSchema
): InitGeneratorSchema {
  return { ...options, unitTestRunner: options.unitTestRunner ?? 'jest' };
}
