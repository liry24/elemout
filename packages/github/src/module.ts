import { defineWxtModule } from 'wxt/modules'
import 'wxt'

export interface GithubModuleOptions {
    /** GitHub OAuth App の Client ID（省略時は VITE_GITHUB_CLIENT_ID 環境変数を使用） */
    clientId?: string
}

declare module 'wxt' {
    export interface InlineConfig {
        github?: GithubModuleOptions
    }
}

export default defineWxtModule<GithubModuleOptions>({
    name: '@repo/github',
    configKey: 'github',

    imports: [
        { from: '@repo/github', name: 'setupGithubAuth' },
        { from: '@repo/github', name: 'useGithubAuth' },
        { from: '@repo/github', name: 'setupGistSync' },
        { from: '@repo/github', name: 'useGistSync' },
        { from: '@repo/github', name: 'setupGistSyncBackground' },
    ],

    setup(wxt, options) {
        // VITE_GITHUB_CLIENT_ID が未設定の場合に警告
        wxt.hook('config:resolved', () => {
            const clientId = options?.clientId ?? process.env.VITE_GITHUB_CLIENT_ID
            if (!clientId) {
                wxt.logger.warn(
                    '[@repo/github] VITE_GITHUB_CLIENT_ID が設定されていません。' +
                        'wxt.config.ts の github.clientId または .env ファイルで設定してください。',
                )
            }
        })
    },
})
