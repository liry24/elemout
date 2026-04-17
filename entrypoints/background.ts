import { defineProxy } from 'comctx'

const CONFLICT_NOTIFICATION_ID = 'sync-conflict'

const { debouncedSync } = setupGistSyncBackground({
    ...appDataSync,
    hooks: {
        onEvent(event) {
            if (event.type !== 'conflict-detected') return

            void browser.notifications.create(CONFLICT_NOTIFICATION_ID, {
                type: 'basic',
                iconUrl: browser.runtime.getURL('/icons/128.png'),
                title: i18n.t('notification.syncConflictTitle'),
                message: i18n.t('notification.syncConflictMessage'),
            })
        },
    },
})

const scheduleBackupSync = async () => {
    if (!(await gistBackupEnabled.getValue())) return
    debouncedSync()
}

let _elementHiddenCb: ((element: HiddenElement, host: string) => void) | null = null
let _stopSelectionCb: (() => void) | null = null
let _selectionStartedCb: (() => void) | null = null

const [provideBackgroundService] = defineProxy(
    (): IBackgroundService => ({
        async saveElement(host, element) {
            await addHostElement(host, element)
            await scheduleBackupSync()
            try {
                _elementHiddenCb?.(element, host)
            } catch {
                _elementHiddenCb = null
            }
        },
        async scheduleGistSync() {
            await scheduleBackupSync()
        },
        async reportStopSelection() {
            await selectingFlag.setValue(false)
            try {
                _stopSelectionCb?.()
            } catch {
                _stopSelectionCb = null
            }
        },
        async reportSelectionStarted() {
            await selectingFlag.setValue(true)
            try {
                _selectionStartedCb?.()
            } catch {
                _selectionStartedCb = null
            }
        },
        async onElementHidden(cb) {
            _elementHiddenCb = cb
        },
        async onStopSelection(cb) {
            _stopSelectionCb = cb
        },
        async onSelectionStarted(cb) {
            _selectionStartedCb = cb
        },
    }),
    { namespace: BACKGROUND_SERVICE_NS, heartbeatCheck: false },
)

export default defineBackground(() => {
    browser.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true })?.catch?.(console.error)

    browser.notifications.onClicked.addListener(async (notificationId) => {
        if (notificationId !== CONFLICT_NOTIFICATION_ID) return

        const windows = await browser.windows.getAll()
        const target = windows.find((windowInfo) => windowInfo.focused) ?? windows[0]
        if (target?.id != null) {
            await browser.sidePanel?.open?.({ windowId: target.id })
        }

        browser.notifications.clear(notificationId)
    })

    // Firefox: サイドパネルからの keepalive 接続を保持する。
    // background 側で参照を持たないとポートが即切断され、サイドパネルが無限リロードする。
    const keepalivePorts = new Set<ReturnType<typeof browser.runtime.connect>>()
    browser.runtime.onConnect.addListener((port) => {
        if (port.name !== 'keepalive') return
        keepalivePorts.add(port)
        port.onDisconnect.addListener(() => keepalivePorts.delete(port))
    })

    provideBackgroundService(createBackgroundProvideAdapter())

    // コンテキストメニューをバックグラウンド起動のたびに登録
    // （開発時のホットリロードでは onInstalled が発火しないため removeAll してから作成）
    void browser.contextMenus.removeAll().then(() => {
        browser.contextMenus.create({
            id: 'start-selection',
            title: i18n.t('contextMenu.hideElement'),
            contexts: ['all'],
            documentUrlPatterns: ['http://*/*', 'https://*/*'],
        })
    })

    browser.contextMenus.onClicked.addListener((_info, tab) => {
        if (!tab?.id) return
        const contentSvc = injectContentService(createContentInjectAdapter(tab.id, 0))
        contentSvc.startSelection().catch(console.error)
    })
})
