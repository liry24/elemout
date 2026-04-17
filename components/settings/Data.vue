<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import { useFileDialog } from '@vueuse/core'

const BACKUP_FILENAME = 'elemout.zip'

type DataArchiveErrorCode =
    | 'invalid-format'
    | 'file-read-failed'
    | 'export-failed'
    | 'import-failed'

interface DataArchiveError extends Error {
    code: DataArchiveErrorCode
}

const { showSuccess } = useStatus()
const { loadList, currentHost } = useTabElements()
type AppDataPayload = Awaited<ReturnType<typeof appDataSync.getData>>

const importPending = ref<AppDataPayload | null>(null)
const importState = ref<{ missingOptionalFiles: string[] } | null>(null)
const error = ref<DataArchiveError | null>(null)
const { expectedFiles, optionalFiles, getData, serialize, deserializeStrict, merge } = appDataSync

const createDataArchiveError = (code: DataArchiveErrorCode, message: string): DataArchiveError =>
    Object.assign(new Error(message), { code })

const clearImport = () => {
    importPending.value = null
    importState.value = null
}

const { open: openFileDialog, onChange } = useFileDialog({
    accept: '.zip,application/zip',
    multiple: false,
    reset: true,
})

onChange((files) => {
    if (!files || files.length === 0) return

    error.value = null
    clearImport()

    void files[0]
        .arrayBuffer()
        .then((buffer) => {
            let parsed
            try {
                parsed = parseArchive(new Uint8Array(buffer), expectedFiles, optionalFiles)
            } catch {
                throw createDataArchiveError('invalid-format', 'Invalid file format')
            }

            importPending.value = deserializeStrict(parsed.files)
            importState.value = { missingOptionalFiles: parsed.missingOptionalFiles }
        })
        .catch((cause: unknown) => {
            error.value =
                cause instanceof Error && 'code' in cause
                    ? (cause as DataArchiveError)
                    : createDataArchiveError(
                          'file-read-failed',
                          cause instanceof Error ? cause.message : 'Failed to read file',
                      )
        })
})

const exportZip = async () => {
    error.value = null
    try {
        const data = await getData()
        const archive = createArchive(serialize(data))
        const filename = getArchiveDownloadName(BACKUP_FILENAME)
        const blob = new Blob([new Uint8Array(archive)], { type: 'application/zip' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = filename
        anchor.click()
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
        showSuccess(i18n.t('jsonIo.exported'))
    } catch (cause) {
        error.value = createDataArchiveError(
            'export-failed',
            cause instanceof Error ? cause.message : 'Export failed',
        )
    }
}

const applyImport = async (mode: 'merge' | 'replace') => {
    if (!importPending.value) return

    try {
        const nextData =
            mode === 'replace' ? importPending.value : merge(await getData(), importPending.value)
        await appDataSync.setData(nextData)
        clearImport()
        showSuccess(i18n.t('jsonIo.imported'))
        await loadList(currentHost.value)
    } catch (cause) {
        error.value = createDataArchiveError(
            'import-failed',
            cause instanceof Error ? cause.message : 'Import failed',
        )
        clearImport()
    }
}

const archiveOmitsSettings = computed(
    () =>
        importState.value?.missingOptionalFiles.some((filename) =>
            optionalFiles.includes(filename),
        ) ?? false,
)
const errorMessage = computed(() => {
    switch (error.value?.code) {
        case 'invalid-format':
            return i18n.t('jsonIo.invalidFormat')
        case 'file-read-failed':
            return i18n.t('jsonIo.fileReadFailed')
        case 'export-failed':
            return i18n.t('jsonIo.exportFailed')
        case 'import-failed':
            return i18n.t('jsonIo.importFailed')
        default:
            return error.value?.message ?? ''
    }
})
</script>

<template>
    <section class="space-y-2">
        <h2 class="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
            {{ i18n.t('settings.data') }}
        </h2>

        <!-- インポート確認（インライン） -->
        <div v-if="importPending" class="card card-body bg-neutral/50 grid gap-4">
            <div>
                <h3 class="text-base-content text-sm font-semibold">
                    {{ i18n.t('settings.importMode.title') }}
                </h3>
                <p class="text-base-content/60 mt-1 text-xs leading-relaxed">
                    {{ i18n.t('settings.importMode.question') }}
                </p>
                <p v-if="archiveOmitsSettings" class="mt-2 text-xs text-amber-400">
                    {{ i18n.t('settings.backupSettingsOmitted') }}
                </p>
            </div>

            <div class="grid gap-2">
                <button class="btn btn-primary btn-sm" @click="applyImport('merge')">
                    {{ i18n.t('settings.importMode.merge') }}

                    <span class="text-primary-content/60">
                        {{ i18n.t('settings.importMode.mergeDesc') }}
                    </span>
                </button>

                <button class="btn btn-primary btn-sm" @click="applyImport('replace')">
                    {{ i18n.t('settings.importMode.replace') }}

                    <span class="text-primary-content/60">
                        {{ i18n.t('settings.importMode.replaceDesc') }}
                    </span>
                </button>

                <button class="btn btn-sm btn-ghost w-full" @click="clearImport()">
                    {{ i18n.t('settings.importMode.cancel') }}
                </button>
            </div>
        </div>

        <!-- 通常表示 -->
        <template v-else>
            <div class="card card-body bg-base-300 grid gap-2">
                <div>
                    <p class="text-base-content text-sm">{{ i18n.t('settings.backupTitle') }}</p>
                    <p class="text-base-content/60 mt-0.5 text-xs">
                        {{ i18n.t('settings.backupDesc') }}
                    </p>
                </div>

                <div class="grid grid-cols-2 gap-1">
                    <button class="btn btn-soft btn-primary btn-sm" @click="openFileDialog()">
                        <Icon icon="mingcute:download-fill" width="18" class="shrink-0" />
                        <span>{{ i18n.t('settings.import') }}</span>
                    </button>

                    <button class="btn btn-soft btn-primary btn-sm" @click="exportZip()">
                        <Icon icon="mingcute:upload-fill" width="18" class="shrink-0" />
                        <span>{{ i18n.t('settings.export') }}</span>
                    </button>
                </div>
            </div>
        </template>

        <p v-if="error" class="text-xs text-rose-400">{{ errorMessage }}</p>
    </section>
</template>
