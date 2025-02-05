import { App, ManifestSchema } from '@forge/manifest';
import {
  resourceTypeByResourceDefinition,
  isResourceType,
  ResourceType,
} from './util-manifest';
import { HostedResourcesSchema } from '@forge/manifest/out/schema/manifest';

describe('util-manifest', () => {
  const makeCustomUIResources = (n: number): HostedResourcesSchema[] =>
    [...Array<HostedResourcesSchema>(n)].map((_, i) => ({
      key: `custom-ui-${i}`,
      path: `custom-ui-${i}-proj-ref`,
      tunnel: {
        port: 4200 + i,
      },
    }));

  const resources = makeCustomUIResources(3);
  const anotherResource: HostedResourcesSchema = {
    key: 'another-resource',
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
    },
    resources: [...resources, anotherResource],
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
        resourceTypeByResourceDefinition(manifest)(anotherResource)
      ).toStrictEqual('generic');
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
        isResourceType(manifest, acceptedResourceTypes)(anotherResource)
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
        isResourceType(manifest, acceptedResourceTypes)(anotherResource)
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
        isResourceType(manifest, acceptedResourceTypes)(anotherResource)
      ).toStrictEqual(false);
    });
    it('should filter UI resources', () => {
      expect(manifest.resources).toHaveLength(4);
      expect(
        manifest.resources.filter(
          isResourceType(manifest, ['custom-ui', 'ui-kit'])
        )
      ).toHaveLength(3);
      expect(
        manifest.resources.filter(isResourceType(manifest, ['custom-ui']))
      ).toHaveLength(2);
      expect(
        manifest.resources.filter(isResourceType(manifest, ['ui-kit']))
      ).toHaveLength(1);
    });
  });
});
