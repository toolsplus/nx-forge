import {defineConfig} from 'vitepress'

const base = '/nx-forge/'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base,
  title: "Nx Forge",
  description: "Efficient and scalable Forge app development",
  head: [['link', {rel: 'icon', href: `${base}favicon.ico`}]],
  cleanUrls: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    search: {
      provider: 'algolia',
      options: {
        appId: 'NIRN68S2VE',
        apiKey: '3035f7ea4bf8c165ea89c04d628aebb9',
        indexName: 'nx-forge'
      }
    },
    nav: [
      {text: 'Home', link: '/'},
      {text: 'Guides', link: '/guides/getting-started', activeMatch: '/guides/'},
      {text: 'Reference', link: '/reference/generators', activeMatch: '/reference/'},
      {text: 'Concepts', link: '/concepts/motivation', activeMatch: '/concepts/'},
      {text: 'Discussions', link: 'https://github.com/toolsplus/nx-forge/discussions'},
      {text: 'Releases', link: 'https://github.com/toolsplus/nx-forge/releases'},
      {text: 'Contributing', link: 'https://github.com/toolsplus/nx-forge/blob/main/CONTRIBUTING.md'}
    ],
    sidebar: {
      '/guides/': {
        base: '/guides/',
        items: [
          {
            text: 'Introduction',
            items: [
              {text: 'Getting started', link: 'getting-started'},
            ]
          },
          {
            text: 'Usage',
            items: [
              {text: 'Generating a Forge app', link: 'generating-a-forge-app'},
              {text: 'Adding a Custom UI module', link: 'adding-a-custom-ui-module'},
              {text: 'Adding a UI Kit 2 module', link: 'adding-a-ui-kit-2-module'},
              {text: 'Transforming the manifest', link: 'transforming-the-manifest'},
            ]
          },
          {
            text: 'Maintenance',
            items: [
              {text: 'Migrating to a newer plugin version', link: 'migrating-plugin-version'},
            ]
          },
          {
            text: 'Examples',
            items: [
              {text: 'Nx Forge Examples', link: 'examples'},
            ]
          }

        ]
      },
      '/reference/': {
        base: '/reference/',
        items: [
          {
            text: 'Reference',
            items: [
              {text: 'Generators', link: 'generators'},
              {text: 'Executors', link: 'executors'},
            ]
          }
        ],
      },
      '/concepts/': {
        base: '/concepts/',
        items: [
          {
            text: 'Concepts',
            items: [
              {text: 'Motivation', link: 'motivation'},
              {text: 'Workspace layout', link: 'workspace-layout'},
              {text: 'Project graph', link: 'project-graph'}
            ]
          }
        ]
      },
    },
    socialLinks: [
      {icon: 'github', link: 'https://github.com/toolsplus/nx-forge'}
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present ToolsPlus'
    }
  }
})
