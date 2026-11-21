import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { removeBundlePackageJson } from './remove-bundle-package-json';

describe('removeBundlePackageJson', () => {
  let bundlePath: string;

  beforeEach(() => {
    bundlePath = join(
      mkdtempSync(join(tmpdir(), 'nx-forge-bundle-')),
      'functions'
    );
    mkdirSync(bundlePath);
    writeFileSync(join(bundlePath, 'index.js'), '');
  });

  afterEach(() => {
    rmSync(join(bundlePath, '..'), { recursive: true, force: true });
  });

  it('should remove a package.json that the build copied into the bundle folder', () => {
    writeFileSync(
      join(bundlePath, 'package.json'),
      JSON.stringify({ type: 'module' })
    );

    removeBundlePackageJson(bundlePath);

    expect(existsSync(join(bundlePath, 'package.json'))).toBe(false);
    expect(existsSync(join(bundlePath, 'index.js'))).toBe(true);
  });

  it('should do nothing if the bundle folder has no package.json', () => {
    expect(() => removeBundlePackageJson(bundlePath)).not.toThrow();
    expect(existsSync(join(bundlePath, 'index.js'))).toBe(true);
  });
});
