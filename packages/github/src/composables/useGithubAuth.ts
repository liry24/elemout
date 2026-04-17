import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device'
import type { OAuthAppStrategyOptions } from '@octokit/auth-oauth-device'
import { ref, onMounted } from 'vue'
import { storage } from 'wxt/utils/storage'

import {
    githubGistId,
    githubToken,
    lastSyncedData,
    syncConflictPending,
    syncInProgress,
} from '../storage'
import type { DeviceFlowState } from '../types'

type Verification = Parameters<OAuthAppStrategyOptions['onVerification']>[0]

export type GithubAuthAction = 'login' | 'logout'

export type GithubAuthEvent =
    | { type: 'login-completed'; username: string }
    | { type: 'logged-out' }
    | { type: 'error'; action: GithubAuthAction; error: Error }

export interface UseGithubAuthHooks {
    onEvent?: (event: GithubAuthEvent) => void | Promise<void>
}

export interface UseGithubAuthOptions {
    clientId?: string
    hooks?: UseGithubAuthHooks
}

const getUsername = (token: string): Promise<string> =>
    fetch('https://api.github.com/user', {
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
        },
    })
        .then((response) => {
            if (!response.ok)
                throw Object.assign(new Error(response.statusText), { status: response.status })
            return response.json() as Promise<{ login: string }>
        })
        .then((data) => data.login)
        .catch((error) => {
            throw new Error(`Failed to get user info (${error.status ?? error.message})`)
        })

const startDeviceAuth = (clientId: string, onVerification: (value: Verification) => void) =>
    createOAuthDeviceAuth({
        clientType: 'oauth-app',
        clientId,
        scopes: ['gist'],
        onVerification,
    })({ type: 'oauth' })
        .then((result) => result.token)
        .catch((error: Error) => {
            throw new Error(error.message ?? 'Login failed')
        })

const clearStoredGithubSession = async () => {
    await storage.removeItems([
        githubToken,
        githubGistId,
        lastSyncedData,
        syncConflictPending,
        syncInProgress,
    ])
}

export const useGithubAuth = (options: UseGithubAuthOptions = {}) => {
    const resolvedClientId =
        options.clientId ?? (import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined) ?? ''
    const token = ref<string | null>(null)
    const username = ref('')
    const loading = ref(false)
    const error = ref<Error | null>(null)
    const deviceFlow = ref<DeviceFlowState | null>(null)
    let loginGeneration = 0

    const emit = async (event: GithubAuthEvent) => {
        await options.hooks?.onEvent?.(event)
    }

    const normalizeError = (value: unknown, fallback = 'Operation failed'): Error =>
        value instanceof Error ? value : new Error(fallback)

    const run = async (action: GithubAuthAction, fn: () => Promise<void>) => {
        loading.value = true
        error.value = null
        try {
            await fn()
        } catch (cause) {
            const normalizedError = normalizeError(cause)
            error.value = normalizedError
            await emit({ type: 'error', action, error: normalizedError })
        } finally {
            loading.value = false
        }
    }

    onMounted(async () => {
        const savedToken = await githubToken.getValue()
        if (!savedToken) return

        try {
            token.value = savedToken
            username.value = await getUsername(savedToken)
        } catch (cause) {
            const status = (cause as Error & { status?: number }).status
            if (status === 401 || status === 403) {
                await clearStoredGithubSession()
                token.value = null
                username.value = ''
            }
        }
    })

    const login = () => {
        const generation = ++loginGeneration
        return run('login', async () => {
            const accessToken = await startDeviceAuth(resolvedClientId, (value) => {
                deviceFlow.value = {
                    userCode: value.user_code,
                    verificationUri: value.verification_uri,
                    polling: true,
                }
            }).finally(() => {
                deviceFlow.value = null
            })

            if (generation !== loginGeneration) return

            await githubToken.setValue(accessToken)
            token.value = accessToken
            username.value = await getUsername(accessToken)
            await emit({ type: 'login-completed', username: username.value })
        })
    }

    const cancelLogin = () => {
        loginGeneration++
        deviceFlow.value = null
        loading.value = false
        error.value = null
    }

    const logout = () =>
        run('logout', async () => {
            await clearStoredGithubSession()
            token.value = null
            username.value = ''
            deviceFlow.value = null
            await emit({ type: 'logged-out' })
        })

    return {
        token,
        username,
        loading,
        error,
        deviceFlow,
        login,
        cancelLogin,
        logout,
    }
}
