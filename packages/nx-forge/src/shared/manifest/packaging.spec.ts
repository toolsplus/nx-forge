import { ManifestSchema } from '@forge/manifest';
import { verifyPackagingKeys } from './packaging';

const manifest = (app: Partial<ManifestSchema['app']>): ManifestSchema =>
  ({
    modules: {},
    app: {
      id: 'ari:cloud:ecosystem::app/to-be-generated',
      runtime: { name: 'nodejs24.x' },
      ...app,
    },
  } as ManifestSchema);

describe('verifyPackagingKeys', () => {
  it('should accept a manifest with the manual packaging keys', () => {
    expect(() =>
      verifyPackagingKeys(
        manifest({ package: { bundler: 'manual@2026', path: 'bundle' } }),
        'apps/my-app/manifest.yml'
      )
    ).not.toThrow();
  });

  it('should accept other package keys next to the manual packaging keys', () => {
    expect(() =>
      verifyPackagingKeys(
        manifest({
          package: {
            bundler: 'manual@2026',
            path: 'bundle',
            extraFiles: ['README.md'],
          },
        }),
        'apps/my-app/manifest.yml'
      )
    ).not.toThrow();
  });

  it('should fail with the lines to add for a value that the manifest schema rejects', () => {
    expect(() =>
      verifyPackagingKeys(
        { app: { package: { bundler: 'manual@2025' } } },
        'apps/my-app/manifest.yml'
      )
    ).toThrow('    bundler: manual@2026\n    path: bundle');
  });

  it('should fail with the lines to add when the keys are missing', () => {
    expect(() =>
      verifyPackagingKeys(manifest({}), 'apps/my-app/manifest.yml')
    ).toThrow(
      [
        'apps/my-app/manifest.yml must set the manual packaging keys. Add these lines:',
        '',
        'app:',
        '  package:',
        '    bundler: manual@2026',
        '    path: bundle',
      ].join('\n')
    );
  });

  it.each([
    [{ bundler: 'webpack', path: 'bundle' }, 'app.package.bundler'],
    [{ bundler: 'manual@2026', path: 'src' }, 'app.package.path'],
    [{ bundler: 'manual@2026' }, 'app.package.path'],
  ] as const)(
    'should name the key that has a different value (%j)',
    (packageKeys, key) => {
      expect(() =>
        verifyPackagingKeys(
          manifest({ package: packageKeys }),
          'apps/my-app/manifest.yml'
        )
      ).toThrow(key);
    }
  );
});
