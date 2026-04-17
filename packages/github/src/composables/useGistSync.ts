import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'

import { apiListUserGists, apiLoadGist, apiSaveGist } from '../gist/api'
import { syncWithGist } from '../gist/sync'
import type { SyncOptions, SyncResult } from '../gist/sync'
import {
    githubGistId,
    githubToken,
    lastSyncedData,
    syncConflictPending,
    syncInProgress,
} from '../storage'
import { wrapGistContent, unwrapGistContent } from '../types'
import type { GistSummary, SyncConflictData } from '../types'

export type GistSyncAction = 'list-gists' | 'connect-gist' | 'sync' | 'resolve-conflict'
export type GistSyncTrigger = 'sync' | 'connect-gist'
export type GistSyncCompletedResult = 'first_upload' | 'upload' | 'download' | 'noop'
export type GistConnectResult = 'matched' | 'conflict'

export type GistSyncEvent<T> =
    | {
          type: 'sync-completed'
          result: GistSyncCompletedResult
          trigger: GistSyncTrigger
      }
    | { type: 'conflict-detected'; conflict: SyncConflictData<T> }
    | { type: 'conflict-resolved'; mode: 'local' | 'remote' | 'merge' }
    | { type: 'error'; action: GistSyncAction; error: Error }

export interface UseGistSyncHooks<T> {
    onEvent?: (event: GistSyncEvent<T>) => void | Promise<void>
}

export interface UseGistSyncOptions<T> {
    getData: () => Promise<T>
    setData: (data: T) => Promise<void>
    merge: (local: T, remote: T) => T
    stringify?: (data: T) => string
    initialBase: T
    gistFilename?: string
    serialize?: (data: T) => Record<string, string>
    deserialize?: (files: Record<string, string>) => T
    gistFilterFileNames?: string[]
    gistDescription?: string
    hooks?: UseGistSyncHooks<T>
}

export const createGistSync = <T>(options: UseGistSyncOptions<T>) => {
    const gistFilename = options.gistFilename ?? 'data.json'
    const serialize =
        options.serialize ?? ((data: T) => ({ [gistFilename]: wrapGistContent(data) }))
    const deserialize =
        options.deserialize ??
        ((files: Record<string, string>) => unwrapGistContent<T>(files[gistFilename]).data)
    const stringify = options.stringify ?? JSON.stringify
    const gistFilterFileNames = options.gistFilterFileNames ?? [gistFilename]
    const gistId = ref<string | null>(null)
    const loading = ref(false)
    const error = ref<Error | null>(null)
    const syncConflict = shallowRef<SyncConflictData<T> | null>(null)
    const unwatchers: Array<() => void> = []

    const gistUrl = computed(() =>
        gistId.value ? `https://gist.github.com/${gistId.value}` : null,
    )

    const emit = async (event: GistSyncEvent<T>) => {
        await options.hooks?.onEvent?.(event)
    }

    const normalizeError = (value: unknown, fallback = 'Operation failed'): Error =>
        value instanceof Error ? value : new Error(fallback)

    const run = async <TResult>(
        action: GistSyncAction,
        fn: () => Promise<TResult>,
    ): Promise<TResult | null> => {
        loading.value = true
        error.value = null
        try {
            return await fn()
        } catch (cause) {
            const normalizedError = normalizeError(cause)
            error.value = normalizedError
            await emit({ type: 'error', action, error: normalizedError })
            return null
        } finally {
            loading.value = false
        }
    }

    const getRequiredToken = async () => {
        const token = await githubToken.getValue()
        if (!token) throw new Error('GitHub authentication is required')
        return token
    }

    const makeSyncOptions = (): SyncOptions<T> => ({
        getData: options.getData,
        setData: options.setData,
        getLastSynced: () => lastSyncedData.getValue() as Promise<T | null>,
        setLastSynced: (data) => lastSyncedData.setValue(data),
        setGistId: async (id) => {
            await githubGistId.setValue(id)
            gistId.value = id
        },
        merge: options.merge,
        stringify: options.stringify,
        initialBase: options.initialBase,
        gistDescription: options.gistDescription,
        serialize,
        deserialize,
    })

    const syncInternal = async (
        trigger: GistSyncTrigger,
        token: string,
    ): Promise<SyncResult<T>> => {
        const result = await syncWithGist<T>(token, gistId.value, makeSyncOptions())
        if (result.type === 'conflict') {
            syncConflict.value = result.conflict
            await emit({ type: 'conflict-detected', conflict: result.conflict })
        } else {
            await emit({ type: 'sync-completed', result: result.type, trigger })
        }
        return result
    }

    onMounted(async () => {
        unwatchers.push(
            syncConflictPending.watch(async (pending) => {
                if (pending == null) return
                syncConflict.value = pending as SyncConflictData<T>
                await emit({
                    type: 'conflict-detected',
                    conflict: pending as SyncConflictData<T>,
                })
                await syncConflictPending.setValue(null)
            }),
            githubGistId.watch((id) => {
                gistId.value = id
            }),
        )

        gistId.value = await githubGistId.getValue()
        const pending = (await syncConflictPending.getValue()) as SyncConflictData<T> | null
        if (pending) {
            syncConflict.value = pending
            await emit({ type: 'conflict-detected', conflict: pending })
            await syncConflictPending.setValue(null)
        }
    })

    onUnmounted(() => {
        for (const unwatch of unwatchers) unwatch()
        unwatchers.length = 0
    })

    const listGists = (): Promise<GistSummary[] | null> =>
        run('list-gists', async () => {
            const token = await getRequiredToken()
            return apiListUserGists(token, gistFilterFileNames)
        })

    const connectGist = async (id: string): Promise<GistConnectResult | null> =>
        run('connect-gist', async () => {
            const token = await getRequiredToken()
            const remoteFiles = await apiLoadGist(token, id)
            const localData = await options.getData()
            const remoteData = deserialize(remoteFiles)

            await githubGistId.setValue(id)
            gistId.value = id

            if (stringify(localData) === stringify(remoteData)) {
                const persistedLocal = await options.getData()
                await lastSyncedData.setValue(structuredClone(persistedLocal))
                await syncConflictPending.setValue(null)
                syncConflict.value = null
                await emit({ type: 'sync-completed', result: 'noop', trigger: 'connect-gist' })
                return 'matched'
            }

            await lastSyncedData.setValue(null)
            await syncConflictPending.setValue(null)
            const conflict: SyncConflictData<T> = {
                local: localData,
                remote: remoteData,
            }
            syncConflict.value = conflict
            await emit({ type: 'conflict-detected', conflict })
            return 'conflict'
        })

    const clearSyncState = async () => {
        await syncInProgress.setValue(false)
        await syncConflictPending.setValue(null)
        await lastSyncedData.setValue(null)
        syncConflict.value = null
        error.value = null
    }

    const resolveConflict = async (mode: 'local' | 'remote' | 'merge'): Promise<void> => {
        await run('resolve-conflict', async () => {
            const token = await getRequiredToken()
            if (!syncConflict.value) return
            const { local, remote } = syncConflict.value

            let resolved: T
            if (mode === 'local') {
                resolved = local
            } else if (mode === 'remote') {
                resolved = remote
            } else {
                resolved = options.merge(local, remote)
            }

            await options.setData(resolved)
            const persistedResolved = await options.getData()

            let newGistId: string
            try {
                newGistId = await apiSaveGist(
                    token,
                    gistId.value,
                    serialize(persistedResolved),
                    options.gistDescription,
                )
            } catch (cause) {
                if (
                    cause instanceof Error &&
                    (cause as Error & { status?: number }).status === 404
                ) {
                    newGistId = await apiSaveGist(
                        token,
                        null,
                        serialize(persistedResolved),
                        options.gistDescription,
                    )
                } else {
                    throw cause
                }
            }

            if (newGistId !== gistId.value) {
                await githubGistId.setValue(newGistId)
                gistId.value = newGistId
            }

            await lastSyncedData.setValue(structuredClone(persistedResolved))
            await syncConflictPending.setValue(null)
            syncConflict.value = null
            await emit({ type: 'conflict-resolved', mode })
        })
    }

    const sync = async (): Promise<SyncResult<T> | null> => {
        if (loading.value) return null

        const token = await githubToken.getValue()
        if (!token) return null

        return run('sync', async () => syncInternal('sync', token))
    }

    return {
        gistId,
        gistUrl,
        loading,
        error,
        syncConflict,
        listGists,
        connectGist,
        clearSyncState,
        resolveConflict,
        sync,
    }
}
