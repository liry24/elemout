// GitHub関連の型定義
// WXT/Vueのauto-importは使用不可。型のみのため外部importは不要。

/** Gist/JSONファイルの共通コンテナ型 */
export interface GistFileContent<T> {
    version: 1
    exportedAt: string
    data: T
}

/**
 * データを GistFileContent ラッパー付きの JSON 文字列に変換します。
 * serialize のデフォルト実装や utils/payload.ts での利用に使えます。
 */
export const wrapGistContent = <T>(data: T): string =>
    JSON.stringify(
        { version: 1, exportedAt: new Date().toISOString(), data } satisfies GistFileContent<T>,
        null,
        2,
    )

/**
 * GistFileContent ラッパー付き JSON 文字列をパースして返します。
 * version 不正や parse 失敗時は Error をスローします。
 */
export const unwrapGistContent = <T>(json: string): GistFileContent<T> => {
    let parsed: unknown
    try {
        parsed = JSON.parse(json)
    } catch {
        throw new Error('Gist ファイルの JSON パースに失敗しました')
    }
    if (
        typeof parsed !== 'object' ||
        parsed === null ||
        (parsed as Record<string, unknown>).version !== 1
    ) {
        throw new Error('Gist ファイルの形式が正しくありません (version: 1 が必要)')
    }
    return parsed as GistFileContent<T>
}

/** OAuth デバイスフローの状態 */
export interface DeviceFlowState {
    userCode: string
    verificationUri: string
    polling: boolean
}

/** 3-way マージ競合データ */
export interface SyncConflictData<T> {
    local: T
    remote: T
}

/** Gist 一覧取得時の概要データ */
export interface GistSummary {
    id: string
    description: string
    updatedAt: string
}

export interface GistDataOperations<T> {
    getData: () => Promise<T>
    setData: (data: T) => Promise<void>
    merge: (local: T, remote: T) => T
    stringify?: (data: T) => string
    initialBase: T
    serialize: (data: T) => Record<string, string>
    deserialize: (files: Record<string, string>) => T
    gistFilterFileNames?: string[]
    gistDescription?: string
}
