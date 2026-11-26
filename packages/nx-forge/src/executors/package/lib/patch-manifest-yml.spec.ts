import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { load } from 'js-yaml';
import { patchManifestYml } from './patch-manifest-yml';

const manifest = `modules:
  jira:globalPage:
    - key: custom-ui-page
      title: Custom UI page
      resource: custom-ui
    - key: ui-kit-page
      title: UI Kit page
      resource: ui-kit
      render: native
  rovo:agent:
    - key: agent
      name: Agent
      prompt: resource:prompts;prompt.txt
resources:
  - key: custom-ui
    path: custom-ui-app
  - key: ui-kit
    path: ui-kit-app
  - key: prompts
    path: functions/assets
app:
  id: ari:cloud:ecosystem::app/to-be-generated
  runtime:
    name: nodejs24.x
  package:
    bundler: manual@2026
    path: functions
`;

describe('patchManifestYml', () => {
  let root: string;
  const outputPath = 'dist/apps/my-app';

  const writeArtifactFile = (path: string) => {
    const absolutePath = join(root, outputPath, path);
    mkdirSync(join(absolutePath, '..'), { recursive: true });
    writeFileSync(absolutePath, '');
  };

  const patchedResources = async () => {
    await patchManifestYml({ root, outputPath, resourcePath: 'resources' });
    const patched = load(
      readFileSync(join(root, outputPath, 'manifest.yml'), 'utf8')
    ) as { resources: { key: string; path: string }[] };
    return patched.resources;
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'nx-forge-patch-manifest-'));
    writeArtifactFile('manifest.yml');
    writeFileSync(join(root, outputPath, 'manifest.yml'), manifest);
    writeArtifactFile('resources/custom-ui-app/index.html');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('should point UI resources at their build output and UI Kit resources at their entry file', async () => {
    writeArtifactFile('resources/ui-kit-app/main.js');

    expect(await patchedResources()).toEqual([
      { key: 'custom-ui', path: 'resources/custom-ui-app' },
      { key: 'ui-kit', path: 'resources/ui-kit-app/main.js' },
      { key: 'prompts', path: 'functions/assets' },
    ]);
  });

  it('should fail if the UI Kit build output has no entry file', async () => {
    writeArtifactFile('resources/ui-kit-app/app.js');

    await expect(patchedResources()).rejects.toThrow(
      "Failed to patch resource with key 'ui-kit': Could not find entry point file"
    );
  });
});
