import { App, ManifestSchema } from '@forge/manifest';
import {
  resourceTypeByResourceDefinition,
  isResourceType,
  ResourceType,
} from './util-manifest';
import { HostedResourcesSchema } from '@forge/manifest/out/schema/manifest';

/**
 * The following tests define a manifest with four UI resource definitions and
 * one resource definition that is unrelated to UI.
 *
 * - Resource 0: Custom UI resource associated with a Jira UI module
 * - Resource 1: Custom UI resource associated with a Jira UI module
 * - Resource 2: UI Kit resource associated with a Jira UI module
 * - Resource 3: Custom UI resource defined in the manifest but not directly
 *               referenced by a UI module (Use case: Custom UI modal dialogs
 *               https://developer.atlassian.com/platform/forge/apis-reference/ui-api-bridge/modal/)
 * - Resource 4: Static resource referencing a folder, as used in Rovo agents
 *               to reference file directories.
 */
describe('util-manifest', () => {
  const makeUIResources = (n: number): HostedResourcesSchema[] =>
    [...Array<HostedResourcesSchema>(n)].map((_, i) => ({
      key: `ui-resource-${i}`,
      path: `ui-resource-${i}-proj-ref`,
      tunnel: {
        port: 4200 + i,
      },
    }));

  const resources = makeUIResources(4);
  const staticResource: HostedResourcesSchema = {
    key: 'static-resource',
    path: 'not/a/project/ref',
  };
  const fakeApp: App = {
    id: 'fake-id',
    runtime: {
      name: 'nodejs22.x',
    },
  };
  const manifest: ManifestSchema = {
    modules: {
      'jira:globalPage': [
        {
          key: 'global-page-0',
          title: 'global page',
          resource: resources[0].key,
          resolver: { function: 'resolver' },
        },
        {
          key: 'global-page-1',
          title: 'global page',
          render: 'default',
          resource: resources[1].key,
          resolver: { function: 'resolver' },
        },
        {
          key: 'global-page-2',
          title: 'global page',
          render: 'native',
          resource: resources[2].key,
          resolver: { function: 'resolver' },
        },
      ],
      'rovo:agent': [
        {
          key: 'fake-agent',
          name: 'Fake Agent',
          prompt: 'resource:static-resource;prompts/fake-agent-prompt.txt',
        },
      ],
    },
    resources: [...resources, staticResource],
    app: fakeApp,
  };

  describe('determineResourceType', () => {
    it('should recognize resources types', () => {
      expect(
        resourceTypeByResourceDefinition(manifest)(resources[0])
      ).toStrictEqual('custom-ui');
      expect(
        resourceTypeByResourceDefinition(manifest)(resources[1])
      ).toStrictEqual('custom-ui');
      expect(
        resourceTypeByResourceDefinition(manifest)(resources[2])
      ).toStrictEqual('ui-kit');
      expect(
        resourceTypeByResourceDefinition(manifest)(resources[3])
      ).toStrictEqual('custom-ui');
      expect(
        resourceTypeByResourceDefinition(manifest)(staticResource)
      ).toStrictEqual('static');
    });
  });

  describe('isResourceType', () => {
    it('should recognize UI resource types', () => {
      const acceptedResourceTypes: ResourceType[] = ['ui-kit', 'custom-ui'];
      expect(
        isResourceType(manifest, acceptedResourceTypes)(resources[0])
      ).toStrictEqual(true);
      expect(
        isResourceType(manifest, acceptedResourceTypes)(resources[1])
      ).toStrictEqual(true);
      expect(
        isResourceType(manifest, acceptedResourceTypes)(resources[2])
      ).toStrictEqual(true);
      expect(
        isResourceType(manifest, acceptedResourceTypes)(resources[3])
      ).toStrictEqual(true);
      expect(
        isResourceType(manifest, acceptedResourceTypes)(staticResource)
      ).toStrictEqual(false);
    });
    it('should recognize only Custom UI resources', () => {
      const acceptedResourceTypes: ResourceType[] = ['custom-ui'];
      expect(
        isResourceType(manifest, acceptedResourceTypes)(resources[0])
      ).toStrictEqual(true);
      expect(
        isResourceType(manifest, acceptedResourceTypes)(resources[1])
      ).toStrictEqual(true);
      expect(
        isResourceType(manifest, acceptedResourceTypes)(resources[2])
      ).toStrictEqual(false);
      expect(
        isResourceType(manifest, acceptedResourceTypes)(resources[3])
      ).toStrictEqual(true);
      expect(
        isResourceType(manifest, acceptedResourceTypes)(staticResource)
      ).toStrictEqual(false);
    });
    it('should recognize only UI Kit resources', () => {
      const acceptedResourceTypes: ResourceType[] = ['ui-kit'];
      expect(
        isResourceType(manifest, acceptedResourceTypes)(resources[0])
      ).toStrictEqual(false);
      expect(
        isResourceType(manifest, acceptedResourceTypes)(resources[1])
      ).toStrictEqual(false);
      expect(
        isResourceType(manifest, acceptedResourceTypes)(resources[2])
      ).toStrictEqual(true);
      expect(
        isResourceType(manifest, acceptedResourceTypes)(resources[3])
      ).toStrictEqual(false);
      expect(
        isResourceType(manifest, acceptedResourceTypes)(staticResource)
      ).toStrictEqual(false);
    });
    it('should filter UI resources', () => {
      expect(manifest.resources).toHaveLength(5);
      expect(
        manifest.resources.filter(
          isResourceType(manifest, ['custom-ui', 'ui-kit'])
        )
      ).toHaveLength(4);
      expect(
        manifest.resources.filter(isResourceType(manifest, ['custom-ui']))
      ).toHaveLength(3);
      expect(
        manifest.resources.filter(isResourceType(manifest, ['ui-kit']))
      ).toHaveLength(1);
    });
  });
});
