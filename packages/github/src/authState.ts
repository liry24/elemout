import { useGithubAuth as createGithubAuth } from './composables/useGithubAuth'
import type { UseGithubAuthOptions } from './composables/useGithubAuth'

export type GithubAuthReturn = ReturnType<typeof createGithubAuth>

let githubAuthState: GithubAuthReturn | null = null

export const setupGithubAuth = (options?: UseGithubAuthOptions): GithubAuthReturn => {
    const auth = createGithubAuth(options)
    githubAuthState = auth
    return auth
}

export const useGithubAuth = (): GithubAuthReturn => {
    if (!githubAuthState) {
        throw new Error(
            'useGithubAuth() was called before setupGithubAuth(). Call setupGithubAuth() at the application root first.',
        )
    }

    return githubAuthState
}
