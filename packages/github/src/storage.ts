import { storage } from 'wxt/utils/storage'

/** GitHub OAuth アクセストークン */
export const githubToken = storage.defineItem<string | null>('local:github_token', {
    fallback: null,
})

/** 同期先 Gist の ID */
export const githubGistId = storage.defineItem<string | null>('local:github_gist_id', {
    fallback: null,
})

/** 複数コンテキスト間で同期処理の重複実行を抑えるフラグ */
export const syncInProgress = storage.defineItem<boolean>('session:gistSyncInProgress', {
    fallback: false,
})

/**
 * バックグラウンドで検出された保留中の競合データ。
 * 型引数は呼び出し側で管理されるため unknown で定義。
 */
export const syncConflictPending = storage.defineItem<unknown>('local:syncConflictPending', {
    fallback: null,
})

/**
 * 3-way マージ用の前回同期スナップショット。
 * 型引数は呼び出し側で管理されるため unknown で定義。
 */
export const lastSyncedData = storage.defineItem<unknown>('local:lastSyncedData', {
    fallback: null,
})
