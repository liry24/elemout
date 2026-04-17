import { DOMSelector } from '@asamuzakjp/dom-selector'
import { matchesKeyboardEvent, parseHotkey } from '@tanstack/vue-hotkeys'
import { defineProxy } from 'comctx'
import getCssSelector from 'css-selector-generator'

const STYLE_ID = '__element-hide-styles__'

const hiddenSelectors = new Set<string>()
const ruleSelectors = new Set<string>()

const { querySelectorAll } = new DOMSelector(window, document)

const buildStyleContent = () => {
    const base = `
        [data-epreview] {
            opacity: 0.4 !important;
            outline: 2px dashed #3b82f6 !important;
            outline-offset: 2px !important;
        }
        [data-ehide-selecting] iframe {
            pointer-events: none !important;
        }
        [data-ehide-selecting] {
            cursor: crosshair !important;
        }
    `
    const allSelectors = new Set(
        [...hiddenSelectors, ...ruleSelectors].filter((selector) => isValidCssSelector(selector)),
    )
    const rules = Array.from(allSelectors)
        .filter((s) => !previewSelectors.has(s))
        .map((s) => `${s} { display: none !important; }`)
        .join('\n')
    return base + rules
}

const refreshStyles = () => {
    const style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
    if (style) style.textContent = buildStyleContent()
}

const injectStyles = () => {
    if (document.getElementById(STYLE_ID)) {
        refreshStyles()
        return
    }
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = buildStyleContent()
    document.head.appendChild(style)
}

const eachElement = (selector: string, fn: (el: HTMLElement) => void) =>
    isValidCssSelector(selector)
        ? querySelectorAll(selector, document)
              .filter((el): el is HTMLElement => el instanceof HTMLElement)
              .forEach(fn)
        : undefined

const replaceSelectorSet = (target: Set<string>, selectors: Iterable<string>) => {
    target.clear()
    for (const selector of selectors) {
        if (isValidCssSelector(selector)) target.add(selector)
    }
}

const syncHiddenSelectors = (data: StorageData) => {
    if (!isHideEnabled) {
        hiddenSelectors.clear()
        refreshStyles()
        return
    }
    replaceSelectorSet(
        hiddenSelectors,
        (data[location.hostname] ?? []).map((item) => item.selector),
    )
    refreshStyles()
}

const syncRuleSelectors = (rules: Rule[]) => {
    if (!isHideEnabled) {
        ruleSelectors.clear()
        refreshStyles()
        return
    }
    replaceSelectorSet(ruleSelectors, getMatchingSelectors(location.hostname, rules))
    refreshStyles()
}

const syncAllSelectors = async (data?: StorageData, rules?: Rule[]) => {
    const [nextData, nextRules] = await Promise.all([
        data ? Promise.resolve(data) : elementHideData.getValue(),
        rules ? Promise.resolve(rules) : elementRulesData.getValue(),
    ])

    if (!isHideEnabled) {
        hiddenSelectors.clear()
        ruleSelectors.clear()
        previewSelectors.clear()
        refreshStyles()
        return
    }

    replaceSelectorSet(
        hiddenSelectors,
        (nextData[location.hostname] ?? []).map((item) => item.selector),
    )
    replaceSelectorSet(ruleSelectors, getMatchingSelectors(location.hostname, nextRules))
    refreshStyles()
}

const logContentError = (action: string, error: unknown) => {
    console.error(`[content] ${action} failed`, error)
}

const hideElement = (selector: string) => {
    if (!isValidCssSelector(selector)) return
    hiddenSelectors.add(selector)
    refreshStyles()
}

const restoreElement = (selector: string) => {
    hiddenSelectors.delete(selector)
    eachElement(selector, (el) => el.removeAttribute('data-epreview'))
    previewSelectors.delete(selector)
    refreshStyles()
}

let isHideEnabled = true
let isSelecting = false
let isWheelInverted = false
let currentScrollModeKey = 's'
let currentSelectionStartKey = ''
const previewSelectors = new Set<string>()

let contentCtx!: InstanceType<typeof ContentScriptContext>
let overlayUi: { remove(): void } | null = null
let overlayInstance: { toggleScrollMode: () => void } | null = null
let overlayBodyObserver: MutationObserver | null = null

const previewElement = (selector: string) => {
    if (!isValidCssSelector(selector)) return
    previewSelectors.add(selector)
    // CSSルールから除外して表示し、data-epreview で半透明スタイルを適用
    refreshStyles()
    eachElement(selector, (el) => el.setAttribute('data-epreview', ''))
}

const endPreview = (selector: string) => {
    if (!isValidCssSelector(selector)) {
        previewSelectors.delete(selector)
        refreshStyles()
        return
    }
    previewSelectors.delete(selector)
    eachElement(selector, (el) => el.removeAttribute('data-epreview'))
    // CSSルールに再追加して非表示に戻す
    refreshStyles()
}

const startSelection = async () => {
    isSelecting = true
    document.documentElement.setAttribute('data-ehide-selecting', '')

    const { default: SelectionOverlay } = await import('@/components/SelectionOverlay.vue')

    const deadzonePx = await wheelDeadzone.getValue()
    const showSelectorPreviewVal = await showSelectorPreview.getValue()

    const ui = await createShadowRootUi(contentCtx, {
        name: 'element-hider-overlay',
        position: 'inline',
        anchor: 'body',
        onMount(container) {
            const app = createApp(SelectionOverlay, {
                isWheelInverted,
                deadzonePx,
                showSelectorPreview: showSelectorPreviewVal,
                scrollModeKey: currentScrollModeKey,
                onHide: (el: Element) => {
                    const selector = getCssSelector(el, { ignoreGeneratedClassNames: true })
                    const element: HiddenElement = {
                        id: crypto.randomUUID(),
                        selector,
                        timestamp: Date.now(),
                    }
                    hideElement(selector)
                    backgroundSvc
                        .saveElement(location.hostname, element)
                        .catch((error) => logContentError('saveElement', error))
                },
                onStop: () => {
                    stopSelection()
                    backgroundSvc
                        .reportStopSelection()
                        .catch((error) => logContentError('reportStopSelection', error))
                },
            })
            overlayInstance = app.mount(container) as unknown as { toggleScrollMode: () => void }
            return app
        },
        onRemove(app) {
            app?.unmount()
            overlayInstance = null
        },
    })
    ui.mount()
    overlayUi = ui

    // shadow host を page root の stacking context に配置し、広告等の高 z-index 要素と同レベルで競合させる。
    // pointer-events: none にすることで document.elementFromPoint が shadow host をスキップし
    // 背面の page 要素（広告含む）を直接返せるようになる。
    // shadow root 内の overlay div は all:initial により pointer-events: auto を維持し
    // マウスイベントは引き続き受け取れる（MDN: pointer-events:none の親でも子が auto なら有効）。
    const shadowHost = ui.shadowHost
    shadowHost.style.setProperty('position', 'fixed', 'important')
    shadowHost.style.setProperty('top', '0', 'important')
    shadowHost.style.setProperty('left', '0', 'important')
    shadowHost.style.setProperty('width', '100%', 'important')
    shadowHost.style.setProperty('height', '100%', 'important')
    shadowHost.style.setProperty('z-index', '2147483647', 'important')
    shadowHost.style.setProperty('pointer-events', 'none', 'important')

    // 広告等が shadow host より後に DOM 挿入されても DOM 末尾維持で z-index 同値時の優位を保つ
    overlayBodyObserver = new MutationObserver(() => {
        if (
            shadowHost.parentElement === document.body &&
            document.body.lastElementChild !== shadowHost
        )
            document.body.appendChild(shadowHost)
    })
    overlayBodyObserver.observe(document.body, { childList: true })

    // サイドパネルに選択モード開始を通知（コンテキストメニュー経由でも確実に届くよう content から送信）
    backgroundSvc
        .reportSelectionStarted()
        .catch((error) => logContentError('reportSelectionStarted', error))
}

const stopSelection = () => {
    isSelecting = false
    document.documentElement.removeAttribute('data-ehide-selecting')
    overlayBodyObserver?.disconnect()
    overlayBodyObserver = null
    overlayUi?.remove()
    overlayUi = null
}

// ─── ContentService の実装 ─────────────────────────────────────────────────

class ContentServiceImpl implements IContentService {
    async startSelection() {
        if (!isSelecting) await startSelection()
    }
    async stopSelection() {
        stopSelection()
    }
    async toggleScrollMode() {
        if (!isSelecting) return
        overlayInstance?.toggleScrollMode()
    }
    async restoreElement(_id: string, selector: string) {
        restoreElement(selector)
    }
    async previewElement(selector: string) {
        previewElement(selector)
    }
    async endPreview(selector: string) {
        endPreview(selector)
    }
    async setHideEnabled(enabled: boolean) {
        isHideEnabled = enabled
        if (!enabled) {
            hiddenSelectors.clear()
            ruleSelectors.clear()
            previewSelectors.clear()
            refreshStyles()
        } else {
            await syncAllSelectors()
        }
    }
    async getStatus() {
        return { isSelecting }
    }
}

const [provideContentService] = defineProxy(() => new ContentServiceImpl(), {
    namespace: CONTENT_SERVICE_NS,
    heartbeatCheck: false,
})

provideContentService(createContentProvideAdapter())

// background に通知するためのプロキシ
const backgroundSvc = injectBackgroundService(createBackgroundInjectAdapter('content'))

export default defineContentScript({
    matches: ['<all_urls>'],
    allFrames: true,
    cssInjectionMode: 'ui',
    async main(ctx) {
        contentCtx = ctx
        const stopWatchers: Array<() => void> = []
        injectStyles()
        // 並列読み込みで待ち時間を最小化
        const [data, rulesData, enabled, invertedVal, scrollKey, startKey] = await Promise.all([
            elementHideData.getValue(),
            elementRulesData.getValue(),
            hideEnabled.getValue(),
            wheelInverted.getValue(),
            scrollModeKey.getValue(),
            selectionStartKey.getValue(),
        ])
        isHideEnabled = enabled
        isWheelInverted = invertedVal
        currentScrollModeKey = scrollKey
        currentSelectionStartKey = startKey
        stopWatchers.push(
            wheelInverted.watch((val) => {
                isWheelInverted = val
            }),
            scrollModeKey.watch((val) => {
                currentScrollModeKey = val
            }),
        )

        // 選択モード起動ショートカット（トップフレームのみ）
        if (window.self === window.top) {
            const onGlobalKeyDown = (e: KeyboardEvent) => {
                if (!currentSelectionStartKey || isSelecting) return
                if (matchesKeyboardEvent(e, parseHotkey(currentSelectionStartKey))) {
                    e.preventDefault()
                    startSelection()
                }
            }
            ctx.addEventListener(document, 'keydown', onGlobalKeyDown, { capture: true })
            stopWatchers.push(
                selectionStartKey.watch((val) => {
                    currentSelectionStartKey = val
                }),
            )
        }
        await syncAllSelectors(data, rulesData)

        // ルール変更を監視して即時再適用
        stopWatchers.push(
            elementRulesData.watch((newRules) => {
                syncRuleSelectors(newRules ?? [])
            }),
        )

        // 非表示要素データ変更を監視して即時再適用（Gist同期等の外部変更に対応）
        stopWatchers.push(
            elementHideData.watch((newData) => {
                syncHiddenSelectors(newData ?? {})
            }),
        )

        ctx.addEventListener(
            window,
            'pagehide',
            () => {
                stopSelection()
                for (const stopWatch of stopWatchers.splice(0)) stopWatch()
            },
            { once: true },
        )
    },
})
