import { createGistSync } from './composables/useGistSync'
import type { UseGistSyncHooks } from './composables/useGistSync'
import type { GistDataOperations } from './types'

export type GistSyncReturn<T> = ReturnType<typeof createGistSync<T>>

export interface GistSyncSetupOptions<T> extends GistDataOperations<T> {
    hooks?: UseGistSyncHooks<T>
}

let gistSyncState: GistSyncReturn<unknown> | null = null

export const setupGistSync = <T>(options: GistSyncSetupOptions<T>): GistSyncReturn<T> => {
    const sync = createGistSync<T>({
        ...options,
        hooks: options.hooks,
    })
    gistSyncState = sync as GistSyncReturn<unknown>
    return sync
}

export const useGistSync = <T>(): GistSyncReturn<T> => {
    if (!gistSyncState)
        throw new Error(
            'useGistSync() was called before setupGistSync(). Call setupGistSync() at the application root first.',
        )
    return gistSyncState as GistSyncReturn<T>
}
