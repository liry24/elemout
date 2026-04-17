import type { SyncConflictData } from '../types'
// Gist 3-way マージ同期ロジック
// 任意のデータ型 T に対応したジェネリック実装
import { apiSaveGist, apiLoadGist } from './api'

export interface SyncOptions<T> {
    /** 現在のローカルデータを返す関数 */
    getData: () => Promise<T>
    /** ローカルデータを保存する関数 */
    setData: (data: T) => Promise<void>
    /** 最後に同期したデータのスナップショットを返す関数 */
    getLastSynced: () => Promise<T | null>
    /** 最後に同期したデータのスナップショットを保存する関数 */
    setLastSynced: (data: T | null) => Promise<void>
    /** 新しい Gist ID を保存する関数 */
    setGistId: (id: string) => Promise<void>
    /** ローカルとリモートをマージする関数 */
    merge: (local: T, remote: T) => T
    /** 変更検出用のシリアライズ関数（デフォルト: JSON.stringify） */
    stringify?: (data: T) => string
    /** 同期履歴がない場合に使用するベースデータ */
    initialBase: T
    /** Gist の description（デフォルト: 'WXT Gist Sync'） */
    gistDescription?: string
    /** T をファイルマップ (filename -> content string) に変換する関数 */
    serialize: (data: T) => Record<string, string>
    /** ファイルマップ (filename -> content string) を T に変換する関数 */
    deserialize: (files: Record<string, string>) => T
}

export type SyncResult<T> =
    | { type: 'first_upload'; newGistId: string }
    | { type: 'upload'; newGistId?: string }
    | { type: 'download' }
    | { type: 'noop' }
    | { type: 'conflict'; conflict: SyncConflictData<T> }

/**
 * ローカルデータと Gist を 3-way マージで同期する。
 * データアクセスはすべて options 経由で行われるため、任意のデータ型に対応可能。
 * コンフリクト時のみ呼び出し元が適切な UI を提供すること。
 */
export const syncWithGist = async <T>(
    token: string,
    currentGistId: string | null,
    options: SyncOptions<T>,
): Promise<SyncResult<T>> => {
    const {
        getData,
        setData,
        getLastSynced,
        setLastSynced,
        setGistId,
        merge: _merge,
        stringify = JSON.stringify,
        initialBase,
        gistDescription,
        serialize,
        deserialize,
    } = options

    const local = await getData()
    const lastSynced = await getLastSynced()

    // Gist が未作成の場合: ローカルをアップロードして完了
    if (!currentGistId) {
        const newGistId = await apiSaveGist(token, null, serialize(local), gistDescription)
        await setGistId(newGistId)
        await setLastSynced(structuredClone(local))
        return { type: 'first_upload', newGistId }
    }

    let remoteFiles: Record<string, string>
    try {
        remoteFiles = await apiLoadGist(token, currentGistId)
    } catch (e) {
        // Gist が削除されていた場合は新規作成にフォールバック
        if (e instanceof Error && (e as Error & { status?: number }).status === 404) {
            const newGistId = await apiSaveGist(token, null, serialize(local), gistDescription)
            await setGistId(newGistId)
            await setLastSynced(structuredClone(local))
            return { type: 'first_upload', newGistId }
        }
        throw e
    }
    const remote = deserialize(remoteFiles)

    const base = lastSynced ?? initialBase
    const localChanged = stringify(local) !== stringify(base)
    const remoteChanged = stringify(remote) !== stringify(base)

    if (!localChanged && !remoteChanged) {
        return { type: 'noop' }
    }

    if (localChanged && !remoteChanged) {
        // ローカルのみ変更 → Gist を更新
        const newGistId = await apiSaveGist(token, currentGistId, serialize(local), gistDescription)
        if (newGistId !== currentGistId) {
            await setGistId(newGistId)
        }
        await setLastSynced(structuredClone(local))
        return { type: 'upload', newGistId: newGistId !== currentGistId ? newGistId : undefined }
    }

    if (!localChanged && remoteChanged) {
        // リモートのみ変更 → ローカルを更新
        await setData(remote)
        const persistedRemote = await getData()
        await setLastSynced(structuredClone(persistedRemote))
        return { type: 'download' }
    }

    // 両方変更されているが内容が同一の場合 → lastSynced が古いだけで実質変化なし
    if (stringify(local) === stringify(remote)) {
        await setLastSynced(structuredClone(local))
        return { type: 'noop' }
    }

    // 両方変更 → 競合: 呼び出し元で解決させる
    return { type: 'conflict', conflict: { local, remote } }
}
