import { beforeEach, describe, expect, it, vi } from 'vitest'

import { syncWithGist } from './sync'

const { apiLoadGist, apiSaveGist } = vi.hoisted(() => ({
    apiLoadGist: vi.fn<() => Promise<Record<string, string>>>(),
    apiSaveGist: vi.fn<() => Promise<string>>(),
}))

vi.mock('./api', () => ({
    apiLoadGist,
    apiSaveGist,
}))

describe('syncWithGist', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('stores a readback-normalized snapshot after remote download', async () => {
        let persisted: { version: string; normalized?: boolean } = { version: 'local' }
        apiLoadGist.mockResolvedValue({
            data: JSON.stringify({ version: 'remote' }),
        })

        const setLastSynced = vi.fn(async () => {})

        const result = await syncWithGist('token', 'gist-id', {
            getData: async () => persisted,
            setData: async (data) => {
                persisted = { ...data, normalized: true }
            },
            getLastSynced: async () => ({ version: 'local' }),
            setLastSynced,
            setGistId: async () => {},
            merge: (_local, remote) => remote,
            stringify: JSON.stringify,
            initialBase: { version: 'initial' },
            serialize: (data) => ({ data: JSON.stringify(data) }),
            deserialize: (files) => JSON.parse(files.data) as { version: string },
        })

        expect(result).toEqual({ type: 'download' })
        expect(setLastSynced).toHaveBeenCalledWith({ version: 'remote', normalized: true })
        expect(apiSaveGist).not.toHaveBeenCalled()
    })

    it('recreates a gist when the configured gist no longer exists', async () => {
        apiLoadGist.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }))
        apiSaveGist.mockResolvedValue('new-gist-id')

        const setGistId = vi.fn(async () => {})
        const setLastSynced = vi.fn(async () => {})

        const result = await syncWithGist('token', 'missing-gist', {
            getData: async () => ({ version: 'local' }),
            setData: async () => {},
            getLastSynced: async () => null,
            setLastSynced,
            setGistId,
            merge: (_local, remote) => remote,
            stringify: JSON.stringify,
            initialBase: { version: 'initial' },
            serialize: (data) => ({ data: JSON.stringify(data) }),
            deserialize: (files) => JSON.parse(files.data) as { version: string },
        })

        expect(result).toEqual({ type: 'first_upload', newGistId: 'new-gist-id' })
        expect(apiSaveGist).toHaveBeenCalledWith(
            'token',
            null,
            { data: JSON.stringify({ version: 'local' }) },
            undefined,
        )
        expect(setGistId).toHaveBeenCalledWith('new-gist-id')
        expect(setLastSynced).toHaveBeenCalledWith({ version: 'local' })
    })
})
