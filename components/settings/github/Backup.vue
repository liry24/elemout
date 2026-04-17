<script lang="ts" setup>
import { Icon } from '@iconify/vue'

interface Props {
    backupEnabled: boolean
    loading: boolean
    gistUrl: string | null
}
const { backupEnabled, loading, gistUrl } = defineProps<Props>()

interface Emit {
    (event: 'toggle-backup', value: boolean): void
    (event: 'sync'): void
    (event: 'open-selector'): void
}
const emit = defineEmits<Emit>()
</script>

<template>
    <div class="card card-body bg-base-300 grid gap-2">
        <div class="flex items-center justify-between gap-2">
            <div>
                <p class="text-base-content text-sm">
                    {{ i18n.t('settings.github.gistBackup') }}
                </p>
                <p class="text-base-content/60 mt-0.5 text-xs">
                    {{ i18n.t('settings.github.gistBackupDesc') }}
                </p>
            </div>

            <input
                type="checkbox"
                :checked="backupEnabled"
                :disabled="loading"
                :aria-label="i18n.t('settings.github.gistBackup')"
                class="toggle"
                @change="emit('toggle-backup', !backupEnabled)"
            />
        </div>

        <button
            :disabled="loading || !backupEnabled"
            class="btn btn-soft btn-sm btn-primary flex-1"
            @click="emit('sync')"
        >
            <Icon
                :icon="loading ? 'svg-spinners:ring-resize' : 'mingcute:refresh-1-line'"
                width="18"
            />
            {{ i18n.t('settings.github.sync') }}
        </button>

        <div class="grid grid-cols-2 gap-1">
            <a
                v-if="gistUrl"
                :href="gistUrl"
                target="_blank"
                class="btn btn-ghost btn-primary btn-sm flex-1"
            >
                <Icon icon="mingcute:arrow-right-up-line" width="18" />
                {{ i18n.t('settings.github.openGist') }}
            </a>
            <button
                v-if="backupEnabled"
                :disabled="loading"
                class="btn btn-ghost btn-primary btn-sm"
                :aria-label="i18n.t('settings.github.changeGist')"
                @click="emit('open-selector')"
            >
                <Icon icon="mingcute:transfer-3-line" width="16" />
                {{ i18n.t('settings.github.changeGist') }}
            </button>
        </div>
    </div>
</template>
