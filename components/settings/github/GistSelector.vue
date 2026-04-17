<script lang="ts" setup>
import { Icon } from '@iconify/vue'

interface Props {
    availableGists: {
        id: string
        description: string
        updatedAt: string
    }[]
    loading: boolean
}
const { availableGists, loading } = defineProps<Props>()

interface Emit {
    (event: 'select', id: string | null): void
    (event: 'cancel'): void
}
const emit = defineEmits<Emit>()

const manualGistId = ref('')
const applyManualGistId = () => {
    const id = manualGistId.value.trim()
    if (!id) return
    manualGistId.value = ''
    emit('select', id)
}

const formatDate = (iso: string) => {
    try {
        return new Date(iso).toLocaleDateString()
    } catch {
        return iso
    }
}
</script>

<template>
    <div class="card card-body bg-base-300 space-y-3">
        <div>
            <h3 class="text-base-content text-sm font-semibold">
                {{ i18n.t('settings.github.selectGist') }}
            </h3>
            <p class="text-base-content/60 mt-1 text-xs leading-relaxed">
                {{ i18n.t('settings.github.selectGistDesc') }}
            </p>
        </div>

        <!-- 候補リスト -->
        <div
            v-if="availableGists.length > 0"
            class="bg-base-200 divide-base-300 divide-y rounded-lg"
        >
            <div
                v-for="gist in availableGists"
                :key="gist.id"
                class="flex items-center gap-2 px-3 py-2"
            >
                <div class="min-w-0 flex-1">
                    <p class="text-base-content truncate text-xs font-medium">
                        {{ gist.description || gist.id }}
                    </p>
                    <p class="text-base-content/50 text-xs">
                        {{ i18n.t('settings.github.updatedAt', [formatDate(gist.updatedAt)]) }}
                    </p>
                </div>
                <button
                    :disabled="loading"
                    class="btn btn-soft btn-primary btn-xs shrink-0"
                    @click="emit('select', gist.id)"
                >
                    {{ i18n.t('settings.github.useThisGist') }}
                </button>
            </div>
        </div>
        <p v-else class="text-base-content/50 text-xs">
            {{ i18n.t('settings.github.noGistsFound') }}
        </p>

        <!-- 手動入力 -->
        <div class="flex gap-2">
            <input
                v-model="manualGistId"
                type="text"
                :placeholder="i18n.t('settings.github.manualGistId')"
                class="input input-sm flex-1 font-mono text-xs"
                @keydown.enter="applyManualGistId"
            />
            <button
                :disabled="loading || !manualGistId.trim()"
                class="btn btn-soft btn-sm"
                @click="applyManualGistId"
            >
                {{ i18n.t('settings.github.applyGistId') }}
            </button>
        </div>

        <!-- 新規作成 / キャンセル -->
        <div class="flex gap-2">
            <button
                :disabled="loading"
                class="btn btn-soft btn-sm flex-1"
                @click="emit('select', null)"
            >
                <Icon icon="mingcute:add-line" width="16" />
                {{ i18n.t('settings.github.createNewGist') }}
            </button>
            <button :disabled="loading" class="btn btn-ghost btn-sm" @click="emit('cancel')">
                {{ i18n.t('settings.deviceLogin.cancel') }}
            </button>
        </div>

        <div v-if="loading" class="text-base-content/60 flex items-center gap-2 text-xs">
            <Icon icon="svg-spinners:ring-resize" width="14" class="shrink-0" />
        </div>
    </div>
</template>
