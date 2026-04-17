import { matchesKeyboardEvent, parseHotkey } from '@tanstack/vue-hotkeys'

// ── Singleton state ───────────────────────────────────────────────────────────
const currentHost = ref('')
const hiddenElements = ref<HiddenElement[]>([])
const isSelecting = ref(false)
const isEnabled = ref(true)
let activeTabId = -1
let currentScrollModeKey = 'S'
let isInitialized = false
let storageUnwatchers: Array<() => void> = []

// ── Service factories ─────────────────────────────────────────────────────────
// アクティブタブに対する ContentService プロキシ（タブが変わるたびに再生成）
const getContentSvc = () => {
    if (activeTabId === -1) return null
    return injectContentService(createContentInjectAdapter(activeTabId))
}

// main frame（frameId: 0）専用のプロキシ。startSelection / getStatus はメインフレームのみに送信する
const getMainFrameContentSvc = () => {
    if (activeTabId === -1) return null
    return injectContentService(createContentInjectAdapter(activeTabId, 0))
}

// BackgroundService プロキシ（サイドパネル → background 方向）
const backgroundSvc = injectBackgroundService(createBackgroundInjectAdapter('sidepanel'))

// ── Actions ───────────────────────────────────────────────────────────────────
const loadList = async (host: string) => {
    const data = await elementHideData.getValue()
    hiddenElements.value = data[host] ?? []
}

const clearCurrentTab = () => {
    currentHost.value = ''
    hiddenElements.value = []
    isSelecting.value = false
    activeTabId = -1
}

const syncSelectionState = async () => {
    const status = await getMainFrameContentSvc()
        ?.getStatus()
        .catch(() => null)
    isSelecting.value = status?.isSelecting ?? false
}

const syncCurrentTab = async (tabId?: number) => {
    const tab =
        tabId !== undefined
            ? await browser.tabs.get(tabId).catch(() => null)
            : (await browser.tabs.query({ active: true, currentWindow: true }))[0]
    if (!tab?.id || !tab.url) {
        clearCurrentTab()
        return
    }
    try {
        const url = new URL(tab.url)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            clearCurrentTab()
            return
        }
        activeTabId = tab.id
        currentHost.value = url.hostname
        await syncSelectionState()
        await loadList(url.hostname)
    } catch {
        clearCurrentTab()
    }
}

const toggleEnabled = async () => {
    const next = !isEnabled.value
    isEnabled.value = next
    await hideEnabled.setValue(next)
    await getContentSvc()?.setHideEnabled(next).catch(console.error)
}

const toggleSelecting = async () => {
    await syncCurrentTab()
    const next = !isSelecting.value
    if (next) {
        const svc = getMainFrameContentSvc()
        if (!svc) return
        await svc.startSelection().catch(console.error)
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    } else {
        const svc = getContentSvc()
        if (!svc) return
        await svc.stopSelection().catch(console.error)
    }
    await syncSelectionState()
}

const restoreElement = async (id: string) => {
    const el = hiddenElements.value.find((e) => e.id === id)
    if (!el) return
    await getContentSvc()?.restoreElement(id, el.selector).catch(console.error)
    hiddenElements.value = await removeHostElement(currentHost.value, id)
}

const restoreElements = async (ids: readonly string[]) => {
    const elements = ids
        .map((id) => hiddenElements.value.find((item) => item.id === id))
        .filter((element): element is HiddenElement => Boolean(element))
    if (!elements.length) return

    const svc = getContentSvc()
    await Promise.all(
        elements.map((element) =>
            svc?.restoreElement(element.id, element.selector).catch(console.error),
        ),
    )
    hiddenElements.value = await removeHostElements(
        currentHost.value,
        elements.map((element) => element.id),
    )
}

const previewElement = async (selector: string) => {
    await getContentSvc()?.previewElement(selector).catch(console.error)
}

const endPreview = async (selector: string) => {
    await getContentSvc()?.endPreview(selector).catch(console.error)
}

// ── Hotkey/keyboard handlers (called from App.vue) ────────────────────────────
export const stopSelecting = async () => {
    await getContentSvc()?.stopSelection().catch(console.error)
    isSelecting.value = false
}

export const handleKeydown = async (e: KeyboardEvent) => {
    if (!isSelecting.value || !currentScrollModeKey) return
    if (matchesKeyboardEvent(e, parseHotkey(currentScrollModeKey))) {
        e.preventDefault()
        await getMainFrameContentSvc()?.toggleScrollMode().catch(console.error)
    }
}

// ── Tab event handlers (registered in App.vue) ────────────────────────────────
const onTabActivated = async (activeInfo: { tabId: number }) => {
    if (isSelecting.value && activeTabId !== -1) {
        await getContentSvc()
            ?.stopSelection()
            .catch(() => {})
        isSelecting.value = false
    }
    await syncCurrentTab(activeInfo.tabId)
}

const onTabUpdated = (tabId: number, changeInfo: { status?: string; url?: string }) => {
    if (changeInfo.status !== 'complete' && typeof changeInfo.url !== 'string') return
    // activeTabId === -1 は起動直後に有効なタブを取得できなかった場合（about:newtab 等）。
    // その後 http ページに遷移したときに再同期するため条件に含める。
    if (tabId === activeTabId || activeTabId === -1) {
        isSelecting.value = false
        void syncCurrentTab()
    }
}

// ── One-time setup / teardown (called from App.vue) ───────────────────────────
export const initTabElements = async () => {
    if (isInitialized) {
        await syncCurrentTab()
        return
    }

    isInitialized = true
    storageUnwatchers = [
        elementHideData.watch((newData) => {
            if (currentHost.value) hiddenElements.value = newData?.[currentHost.value] ?? []
        }),
        scrollModeKey.watch((val) => {
            currentScrollModeKey = val
        }),
        selectingFlag.watch((val) => {
            if (val === false && isSelecting.value) isSelecting.value = false
        }),
    ]

    await syncCurrentTab()
    isEnabled.value = await hideEnabled.getValue()
    currentScrollModeKey = await scrollModeKey.getValue()
    browser.tabs.onActivated.addListener(onTabActivated)
    browser.tabs.onUpdated.addListener(onTabUpdated)
    await backgroundSvc.onStopSelection(() => {
        isSelecting.value = false
    })
    await backgroundSvc.onSelectionStarted(() => {
        isSelecting.value = true
    })
}

export const teardownTabElements = () => {
    isInitialized = false
    browser.tabs.onActivated.removeListener(onTabActivated)
    browser.tabs.onUpdated.removeListener(onTabUpdated)
    for (const unwatch of storageUnwatchers) unwatch()
    storageUnwatchers = []
}

// ── Composable (callable multiple times, no side effects) ─────────────────────
export const useTabElements = () => ({
    currentHost,
    hiddenElements,
    isSelecting,
    isEnabled,
    loadList,
    toggleEnabled,
    toggleSelecting,
    restoreElement,
    restoreElements,
    previewElement,
    endPreview,
})
