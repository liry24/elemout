<script lang="ts" setup>
import { useHotkey } from '@tanstack/vue-hotkeys'
import { useEventListener, useTimeoutFn } from '@vueuse/core'

const router = useRouter()
const route = useRoute()
const { showSuccess } = useStatus()
const { loadList, currentHost, isSelecting } = useTabElements()
const { scheduleGistSync } = injectBackgroundService(createBackgroundInjectAdapter('sidepanel'))
const { deviceFlow } = setupGithubAuth({
    hooks: {
        onEvent(event) {
            if (event.type === 'login-completed') showSuccess(i18n.t('github.loggedIn'))
        },
    },
})
const { loading: syncLoading, syncConflict } = setupGistSync({
    ...appDataSync,
    hooks: {
        onEvent(event) {
            if (event.type === 'sync-completed') {
                if (event.result === 'first_upload') showSuccess(i18n.t('github.backedUp'))
                else if (event.result === 'upload') showSuccess(i18n.t('github.synced'))
                else if (event.result === 'download') {
                    showSuccess(i18n.t('github.syncedFrom'))
                    loadList(currentHost.value)
                } else if (event.trigger === 'connect-gist') showSuccess(i18n.t('github.synced'))
            } else if (event.type === 'conflict-resolved') {
                showSuccess(i18n.t('github.conflictResolved'))
                if (event.mode !== 'local') loadList(currentHost.value)
            }
        },
    },
})

// Escape キーで選択モード終了（isSelecting が true のときのみ有効）
useHotkey('Escape', stopSelecting, { enabled: isSelecting })
// スクロールモードキーのハンドリング
useEventListener(document, 'keydown', handleKeydown)

// 設定・要素データ変更時のデバウンス Gist 同期
const { start: startSyncTimer } = useTimeoutFn(
    () => {
        scheduleGistSync().catch(console.error)
    },
    2000,
    { immediate: false },
)
const settingsItems = [
    elementHideData,
    elementRulesData,
    wheelInverted,
    wheelDeadzone,
    includeSettingsInSync,
    showSelectorPreview,
    scrollModeKey,
    selectionStartKey,
]
const stopSyncWatchers: Array<() => void> = []

onMounted(async () => {
    await initTabElements()
    for (const item of settingsItems)
        stopSyncWatchers.push(
            item.watch(() => {
                // Gist sync による setData/applySettings 起因の変更は無視する
                if (syncLoading.value) return
                startSyncTimer()
            }),
        )
})

onUnmounted(() => {
    teardownTabElements()
    for (const stopWatch of stopSyncWatchers.splice(0)) stopWatch()
})

watch(deviceFlow, (val) => {
    if (val) router.push('/settings')
})

watch(syncConflict, (val, oldVal) => {
    if (val && route.path !== '/settings') router.push('/settings')
    if (!val && oldVal) {
        loadList(currentHost.value)
        if (route.path === '/settings') router.push('/')
    }
})
</script>

<template>
    <RouterView />
</template>
