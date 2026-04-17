import { syncWithGist } from './gist/sync'
import type { SyncOptions } from './gist/sync'
import {
    githubToken,
    githubGistId,
    syncInProgress,
    syncConflictPending,
    lastSyncedData,
} from './storage'
import type { SyncConflictData, GistDataOperations } from './types'

export type GistSyncBackgroundEvent<T> = {
    type: 'conflict-detected'
    conflict: SyncConflictData<T>
}

export interface GistSyncBackgroundHooks<T> {
    onEvent?: (event: GistSyncBackgroundEvent<T>) => void | Promise<void>
}

/** background エントリポイント固有のオプション */
export interface GistSyncBackgroundOptions<T> extends GistDataOperations<T> {
    hooks?: GistSyncBackgroundHooks<T>
    /** デバウンス間隔（ミリ秒）。デフォルト: 2000 */
    debounceMs?: number
}

/**
 * 注入されたデータ操作を使って background エントリポイントで GitHub 同期を設定します。
 *
 * - `onStartup` / `onInstalled` で自動同期
 * - 同期を実行するかどうかの判断はアプリ側で行い、この関数は同期そのものだけを担当します
 *
 * @returns `sync`（即時同期）と `debouncedSync`（デバウンス付き同期）
 */
export const setupGistSyncBackground = <T>(bgOptions: GistSyncBackgroundOptions<T>) => {
    let isSyncing = false
    const debounceMs = bgOptions.debounceMs ?? 2000
    let debounceTimer: ReturnType<typeof setTimeout> | undefined
    const {
        getData,
        setData,
        merge,
        stringify,
        initialBase,
        serialize,
        deserialize,
        gistDescription,
    } = bgOptions

    const emit = async (event: GistSyncBackgroundEvent<T>) => {
        await bgOptions.hooks?.onEvent?.(event)
    }

    const sync = async (): Promise<void> => {
        if (isSyncing || (await syncInProgress.getValue())) return
        const token = await githubToken.getValue()
        const pendingConflict = await syncConflictPending.getValue()
        if (!token || pendingConflict != null) return
        isSyncing = true
        await syncInProgress.setValue(true)
        const currentGistId = await githubGistId.getValue()
        try {
            const syncOptions: SyncOptions<T> = {
                getData,
                setData,
                getLastSynced: () => lastSyncedData.getValue() as Promise<T | null>,
                setLastSynced: (data) => lastSyncedData.setValue(data),
                setGistId: (id) => githubGistId.setValue(id),
                merge,
                stringify,
                initialBase,
                gistDescription,
                serialize,
                deserialize,
            }
            const result = await syncWithGist<T>(token, currentGistId, syncOptions)
            if (result.type === 'conflict') {
                await syncConflictPending.setValue(result.conflict)
                await emit({ type: 'conflict-detected', conflict: result.conflict })
            }
        } catch (e) {
            console.error('[setupGistSyncBackground] sync failed:', e)
        } finally {
            isSyncing = false
            await syncInProgress.setValue(false)
        }
    }

    const debouncedSync = () => {
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => sync(), debounceMs)
    }

    // 起動時・インストール時の自動同期
    browser.runtime.onStartup.addListener(() => {
        sync()
    })

    browser.runtime.onInstalled.addListener((details) => {
        if (details.reason === 'install') sync()
    })

    return { sync, debouncedSync }
}
