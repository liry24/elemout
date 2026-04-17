import { describe, expect, it } from 'vitest'

import { createArchive, getArchiveDownloadName, parseArchive } from './archive'

describe('archive helpers', () => {
    it('creates a zip archive and restores its file map', () => {
        const archive = createArchive({
            'elemout_data.json': '{"ok":true}',
            'elemout_rules.json': '[]',
        })

        expect(
            parseArchive(archive, ['elemout_data.json', 'elemout_rules.json'], []).files,
        ).toEqual({
            'elemout_data.json': '{"ok":true}',
            'elemout_rules.json': '[]',
        })
    })

    it('allows omitted optional files and reports them', () => {
        const archive = createArchive({
            'elemout_data.json': '{"ok":true}',
            'elemout_rules.json': '[]',
        })

        expect(
            parseArchive(
                archive,
                ['elemout_data.json', 'elemout_rules.json', 'elemout_settings.json'],
                ['elemout_settings.json'],
            ).missingOptionalFiles,
        ).toEqual(['elemout_settings.json'])
    })

    it('rejects archives with unexpected files', () => {
        const archive = createArchive({
            'elemout_data.json': '{"ok":true}',
            'evil.txt': 'nope',
        })

        expect(() => parseArchive(archive, ['elemout_data.json'], [])).toThrow(
            'Unexpected archive entry',
        )
    })

    it('creates a zip download name from any configured filename', () => {
        expect(getArchiveDownloadName('elemout.json')).toBe('elemout.zip')
        expect(getArchiveDownloadName('elemout.zip')).toBe('elemout.zip')
        expect(getArchiveDownloadName('backup')).toBe('backup.zip')
    })
})
