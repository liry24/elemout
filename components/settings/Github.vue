<script lang="ts" setup>
import BackupCard from '@/components/settings/github/Backup.vue'
import ConflictCard from '@/components/settings/github/Conflict.vue'
import GistSelector from '@/components/settings/github/GistSelector.vue'
import LoginCard from '@/components/settings/github/Login.vue'

const { token, error: authError, username, loading: authLoading, logout } = useGithubAuth()
const {
    gistId,
    gistUrl,
    error: syncError,
    loading: syncLoading,
    syncConflict,
    listGists,
    connectGist,
    clearSyncState,
    sync,
} = useGistSync<AppDataPayload>()
const backupEnabled = useStorageItem<boolean>(gistBackupEnabled)
const gistSelectorVisible = ref(false)
const availableGists = ref<{ id: string; description: string; updatedAt: string }[]>([])
let isEnablingBackup = false

const closeSelector = () => {
    gistSelectorVisible.value = false
    availableGists.value = []
    isEnablingBackup = false
}

const handleLogout = () => {
    backupEnabled.value = false
    closeSelector()
    void logout()
}

const enableBackup = async () => {
    backupEnabled.value = true

    if (gistId.value) {
        await sync()
        return
    }

    const gists = await listGists()
    if (gists == null) return
    if (gists.length > 0) {
        availableGists.value = gists
        gistSelectorVisible.value = true
        isEnablingBackup = true
        return
    }

    await sync()
}

const disableBackup = async () => {
    backupEnabled.value = false
    closeSelector()
    await clearSyncState()
}

const openGistSelector = async () => {
    const gists = await listGists()
    if (gists == null) return
    availableGists.value = gists
    gistSelectorVisible.value = true
    isEnablingBackup = false
}

const selectGist = async (id: string | null) => {
    closeSelector()
    if (id == null) {
        await sync()
        return
    }
    await connectGist(id)
}

const cancelGistSelector = () => {
    gistSelectorVisible.value = false
    availableGists.value = []
    if (isEnablingBackup) backupEnabled.value = false

    isEnablingBackup = false
}

const toggleBackup = (nextValue: boolean) => {
    if (nextValue) {
        enableBackup()
        return
    }
    disableBackup()
}

const currentError = computed(() => syncError.value ?? authError.value)
const currentErrorMessage = computed(() => {
    const message = currentError.value?.message
    if (!message || message === 'Operation failed') return i18n.t('github.operationFailed')
    if (message === 'GitHub authentication is required') {
        return i18n.t('settings.github.errorAuthRequired')
    }
    if (message === 'Login failed') return i18n.t('settings.github.errorLoginFailed')
    if (message.startsWith('Failed to get user info')) {
        return i18n.t('settings.github.errorUserInfoFailed')
    }
    return message
})
const isBusy = computed(() => authLoading.value || syncLoading.value)

watch(
    token,
    (nextToken) => {
        if (nextToken) return
        backupEnabled.value = false
        closeSelector()
    },
    { flush: 'sync' },
)

watch(
    syncConflict,
    (conflict) => {
        if (!conflict) return
        closeSelector()
    },
    { flush: 'sync' },
)
</script>

<template>
    <section class="space-y-2">
        <h2 class="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
            {{ i18n.t('settings.github.label') }}
        </h2>

        <!-- 未ログイン -->
        <LoginCard v-if="!token" />

        <!-- ログイン済み -->
        <template v-else>
            <!-- エラー表示 -->
            <div v-if="currentError" class="bg-error/10 text-error rounded-lg px-3 py-2 text-xs">
                {{ currentErrorMessage }}
            </div>

            <div class="bg-base-300 flex items-center gap-2 rounded-2xl p-1">
                <img
                    :src="`https://github.com/${username}.png`"
                    alt=""
                    aria-hidden="true"
                    class="ml-2 size-5 rounded-full object-cover"
                />
                <span class="text-base-content font-mono text-xs">{{ username }}</span>

                <button
                    :disabled="isBusy"
                    class="btn btn-ghost btn-sm btn-error ml-auto"
                    @click="handleLogout"
                >
                    {{ i18n.t('settings.github.logout') }}
                </button>
            </div>

            <GistSelector
                v-if="gistSelectorVisible && !syncConflict"
                :available-gists="availableGists"
                :loading="syncLoading"
                @select="selectGist"
                @cancel="cancelGistSelector"
            />
            <BackupCard
                v-else-if="!syncConflict"
                :backup-enabled="backupEnabled"
                :loading="syncLoading"
                :gist-url="gistUrl"
                @toggle-backup="toggleBackup"
                @sync="sync"
                @open-selector="openGistSelector"
            />

            <ConflictCard v-if="syncConflict" />
        </template>
    </section>
</template>
