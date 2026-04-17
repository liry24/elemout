// GitHub API 操作（Gist CRUD）
// wxt/Vueのauto-importは効かないため、型は相対パスからimport
import type { GistSummary } from '../types'

const API = 'https://api.github.com'

type GhRequestInit = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> }

/** GitHub API フェッチラッパー（Bearer認証付き） */
export const ghFetch = async <T>(path: string, token: string, init?: GhRequestInit): Promise<T> => {
    const res = await fetch(`${API}${path}`, {
        ...init,
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            ...init?.headers,
        },
    })
    if (!res.ok) throw Object.assign(new Error(res.statusText), { status: res.status })
    return res.json() as Promise<T>
}

/** Gist を作成または更新し、新しい Gist ID を返す */
export const apiSaveGist = (
    token: string,
    id: string | null,
    files: Record<string, string>,
    description = 'WXT Gist Sync',
): Promise<string> =>
    ghFetch<{ id: string }>(id ? `/gists/${id}` : '/gists', token, {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            description,
            public: false,
            files: Object.fromEntries(
                Object.entries(files).map(([name, content]) => [name, { content }]),
            ),
        }),
    })
        .then((d) => d.id)
        .catch((e) => {
            const err = new Error(`Gist の保存に失敗しました (${e.status ?? e.message})`)
            if (typeof e.status === 'number') Object.assign(err, { status: e.status })
            throw err
        })

/** Gist からファイルマップを読み込む (filename -> content string) */
export const apiLoadGist = async (token: string, id: string): Promise<Record<string, string>> => {
    const res = await ghFetch<{ files: Record<string, { content?: string } | undefined> }>(
        `/gists/${id}`,
        token,
    ).catch((e) => {
        const err = new Error(`Gist の読み込みに失敗しました (${e.status ?? e.message})`)
        if (typeof e.status === 'number') Object.assign(err, { status: e.status })
        throw err
    })
    return Object.fromEntries(
        Object.entries(res.files)
            .filter((entry): entry is [string, { content?: string }] => entry[1] != null)
            .map(([name, file]) => [name, file.content ?? '']),
    )
}

/** ユーザーの Gist を一覧取得し、指定ファイル名を含むものだけを返す */
export const apiListUserGists = async (
    token: string,
    filterFileNames: string[],
): Promise<GistSummary[]> => {
    const gists = await ghFetch<
        Array<{
            id: string
            description: string | null
            updated_at: string
            files: Record<string, unknown>
        }>
    >('/gists?per_page=100', token).catch((e) => {
        const err = new Error(`Gist 一覧の取得に失敗しました (${e.status ?? e.message})`)
        if (typeof e.status === 'number') Object.assign(err, { status: e.status })
        throw err
    })
    return gists
        .filter((g) => filterFileNames.some((name) => name in g.files))
        .map((g) => ({
            id: g.id,
            description: g.description ?? '',
            updatedAt: g.updated_at,
        }))
}
