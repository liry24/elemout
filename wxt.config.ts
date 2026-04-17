import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'

import appConfig from './app.config'

// See https://wxt.dev/api/config.html
export default defineConfig({
    dev: {
        server: {
            port: 3000,
            strictPort: true,
        },
    },

    modules: [
        '@wxt-dev/module-vue',
        '@wxt-dev/i18n/module',
        '@wxt-dev/auto-icons',
        '@repo/github/module',
    ],

    webExt: {
        startUrls: [import.meta.env.VITE_START_URL || 'https://liry24.com'],
    },

    manifest: {
        name: appConfig.name,
        description: '__MSG_extDescription__',
        default_locale: 'en',
        permissions: ['storage', 'tabs', 'sidePanel', 'contextMenus', 'notifications'],
        host_permissions: ['<all_urls>'],
        browser_specific_settings: {
            gecko: {
                data_collection_permissions: {
                    required: ['none'],
                },
            },
        },
    },

    vite: () => ({
        plugins: [tailwindcss()],
        build: {
            rolldownOptions: {
                output: {
                    minify: true,
                    comments: false,
                },
                experimental: {
                    lazyBarrel: true,
                },
            },
        },
    }),

    vue: {
        vite: {
            features: {
                optionsAPI: false,
            },
        },
    },

    imports: {
        imports: [
            { from: 'vue-router', name: 'useRouter' },
            { from: 'vue-router', name: 'useRoute' },
        ],
    },

    autoIcons: {
        sizes: [128, 96, 48, 32, 16],
        developmentIndicator: 'overlay',
    },

    github: {
        clientId: process.env.VITE_GITHUB_CLIENT_ID,
    },
})
