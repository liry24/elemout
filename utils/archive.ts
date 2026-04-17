import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

// アーカイブの最大サイズは GitHub Gist の制限に基づいて設定
const MAX_ARCHIVE_FILE_SIZE = 3 * 1024 * 1024 // 単一ファイルの最大サイズ（3MB）
const MAX_ARCHIVE_TOTAL_SIZE = 10 * 1024 * 1024 // アーカイブ全体の最大サイズ（10MB）

export interface ParsedArchive {
    files: Record<string, string>
    missingOptionalFiles: string[]
}

const normalizeArchiveFilename = (filename: string) => filename.replace(/\\/g, '/').trim()

export const getArchiveDownloadName = (filename: string) => {
    const normalized = filename.trim() || 'backup'
    const withoutExtension = normalized.replace(/\.[^./]+$/, '')
    return `${withoutExtension || 'backup'}.zip`
}

export const createArchive = (files: Record<string, string>) => {
    const entries = Object.entries(files)
    if (entries.length === 0) throw new Error('No archive files to export')

    const zippedEntries = Object.fromEntries(entries.map(([name, value]) => [name, strToU8(value)]))
    return zipSync(zippedEntries, { level: 6 })
}

export const parseArchive = (
    bytes: Uint8Array,
    expectedFiles: readonly string[],
    optionalFiles: readonly string[] = [],
): ParsedArchive => {
    const expected = new Set(expectedFiles)
    const optional = new Set(optionalFiles)

    let extracted: Record<string, Uint8Array>
    try {
        extracted = unzipSync(bytes)
    } catch {
        throw new Error('Invalid archive')
    }

    const files: Record<string, string> = {}
    let totalSize = 0

    for (const [rawName, data] of Object.entries(extracted)) {
        const name = normalizeArchiveFilename(rawName)
        if (!name || !expected.has(name)) throw new Error('Unexpected archive entry')
        if (data.byteLength > MAX_ARCHIVE_FILE_SIZE) throw new Error('Archive entry too large')
        totalSize += data.byteLength
        if (totalSize > MAX_ARCHIVE_TOTAL_SIZE) throw new Error('Archive too large')
        files[name] = strFromU8(data)
    }

    const missingRequiredFiles = expectedFiles.filter(
        (filename) => !(filename in files) && !optional.has(filename),
    )
    if (missingRequiredFiles.length > 0) throw new Error('Missing archive entries')

    return {
        files,
        missingOptionalFiles: expectedFiles.filter(
            (filename) => !(filename in files) && optional.has(filename),
        ),
    }
}
