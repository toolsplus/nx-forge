import { ManifestSchema } from '@forge/manifest';
import { verifyAppPackagingConfiguration } from './packaging';

const manifest = (app: Partial<ManifestSchema['app']>): ManifestSchema =>
  ({
    modules: {},
    app: {
      id: 'ari:cloud:ecosystem::app/to-be-generated',
      runtime: { name: 'nodejs24.x' },
      ...app,
    },
  } as ManifestSchema);

describe('verifyAppPackagingConfiguration', () => {
  it('should accept a manifest with the app packaging configuration', () => {
    expect(() =>
      verifyAppPackagingConfiguration(
        manifest({ package: { bundler: 'manual@2026', path: 'functions' } }),
        'apps/my-app/manifest.yml'
      )
    ).not.toThrow();
  });

  it('should accept other `app.package` settings next to the app packaging configuration', () => {
    expect(() =>
      verifyAppPackagingConfiguration(
        manifest({
          package: {
            bundler: 'manual@2026',
            path: 'functions',
            extraFiles: ['README.md'],
          },
        }),
        'apps/my-app/manifest.yml'
      )
    ).not.toThrow();
  });

  it('should fail with the lines to add for a value that the manifest schema rejects', () => {
    expect(() =>
      verifyAppPackagingConfiguration(
        { app: { package: { bundler: 'manual@2025' } } },
        'apps/my-app/manifest.yml'
      )
    ).toThrow('    bundler: manual@2026\n    path: functions');
  });

  it('should fail with the lines to add when the keys are missing', () => {
    expect(() =>
      verifyAppPackagingConfiguration(manifest({}), 'apps/my-app/manifest.yml')
    ).toThrow(
      [
        'apps/my-app/manifest.yml must configure manual Forge packaging. Add these lines:',
        '',
        'app:',
        '  package:',
        '    bundler: manual@2026',
        '    path: functions',
      ].join('\n')
    );
  });

  it.each([
    [{ bundler: 'webpack', path: 'functions' }, 'app.package.bundler'],
    [{ bundler: 'manual@2026', path: 'src' }, 'app.package.path'],
    [{ bundler: 'manual@2026' }, 'app.package.path'],
  ] as const)(
    'should name the setting that has a different value (%j)',
    (appPackage, key) => {
      expect(() =>
        verifyAppPackagingConfiguration(
          manifest({ package: appPackage }),
          'apps/my-app/manifest.yml'
        )
      ).toThrow(key);
    }
  );
});
