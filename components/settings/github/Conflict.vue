<script lang="ts" setup>
import type { AppDataPayload } from '@/utils/appDataSync'

const { syncConflict: conflict, loading, resolveConflict } = useGistSync<AppDataPayload>()

const localHostCount = computed(() => Object.keys(conflict.value?.local.data ?? {}).length)
const remoteHostCount = computed(() => Object.keys(conflict.value?.remote.data ?? {}).length)
const localElementCount = computed(() =>
    Object.values(conflict.value?.local.data ?? {}).reduce(
        (s, arr) => s + (Array.isArray(arr) ? arr.length : 0),
        0,
    ),
)
const remoteElementCount = computed(() =>
    Object.values(conflict.value?.remote.data ?? {}).reduce(
        (s, arr) => s + (Array.isArray(arr) ? arr.length : 0),
        0,
    ),
)
</script>

<template>
    <div class="card card-body bg-base-300 grid gap-2">
        <div>
            <h3 class="text-base-content text-sm font-semibold">
                {{ i18n.t('settings.github.syncConflict') }}
            </h3>
            <p class="text-base-content/60 mt-1 text-xs leading-relaxed">
                {{ i18n.t('settings.github.syncConflictDesc') }}
            </p>
        </div>

        <div class="bg-base-200 rounded-lg p-3 text-xs">
            <div class="flex items-center justify-between gap-2">
                <span class="text-base-content/60">{{ i18n.t('settings.github.local') }}</span>
                <span class="text-base-content">
                    {{
                        i18n.t('settings.github.stats', [
                            String(localHostCount),
                            String(localElementCount),
                        ])
                    }}
                </span>
            </div>
            <div class="mt-2 flex items-center justify-between gap-2">
                <span class="text-base-content/60">{{ i18n.t('settings.github.gist') }}</span>
                <span class="text-base-content">
                    {{
                        i18n.t('settings.github.stats', [
                            String(remoteHostCount),
                            String(remoteElementCount),
                        ])
                    }}
                </span>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
            <button
                :disabled="loading"
                :aria-label="i18n.t('settings.github.useLocal')"
                class="btn btn-soft"
                :title="i18n.t('settings.github.useLocal')"
                @click="resolveConflict('local')"
            >
                <span class="text-xs">
                    {{ i18n.t('settings.github.useLocalDesc') }}
                </span>
            </button>

            <button
                :disabled="loading"
                :aria-label="i18n.t('settings.github.useGist')"
                class="btn btn-soft"
                :title="i18n.t('settings.github.useGist')"
                @click="resolveConflict('remote')"
            >
                <span class="text-xs">
                    {{ i18n.t('settings.github.useGistDesc') }}
                </span>
            </button>
        </div>

        <button
            :disabled="loading"
            :title="i18n.t('settings.github.merge')"
            class="btn btn-soft"
            @click="resolveConflict('merge')"
        >
            <span class="text-base-content text-xs font-medium">
                {{ i18n.t('settings.github.merge') }}
            </span>
            <span class="text-base-content/60 text-xs">
                {{ i18n.t('settings.github.mergeDesc') }}
            </span>
        </button>
    </div>
</template>
