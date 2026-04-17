import { defineProxy, checkMessage } from 'comctx'
import type { Adapter, OnMessage, Message } from 'comctx'

export interface IContentService {
    startSelection(): Promise<void>
    stopSelection(): Promise<void>
    toggleScrollMode(): Promise<void>
    restoreElement(id: string, selector: string): Promise<void>
    previewElement(selector: string): Promise<void>
    endPreview(selector: string): Promise<void>
    setHideEnabled(enabled: boolean): Promise<void>
    getStatus(): Promise<{ isSelecting: boolean }>
}

export interface IBackgroundService {
    saveElement(host: string, element: HiddenElement): Promise<void>
    scheduleGistSync(): Promise<void>
    reportStopSelection(): Promise<void>
    reportSelectionStarted(): Promise<void>
    onElementHidden(callback: (element: HiddenElement, host: string) => void): Promise<void>
    onStopSelection(callback: () => void): Promise<void>
    onSelectionStarted(callback: () => void): Promise<void>
}

export const CONTENT_SERVICE_NS = '__ext-content-svc__'
export const BACKGROUND_SERVICE_NS = '__ext-background-svc__'

const [, injectContentService] = defineProxy(() => ({}) as IContentService, {
    namespace: CONTENT_SERVICE_NS,
    heartbeatCheck: false,
})
export { injectContentService }

const [, injectBackgroundService] = defineProxy(() => ({}) as IBackgroundService, {
    namespace: BACKGROUND_SERVICE_NS,
    heartbeatCheck: false,
})
export { injectBackgroundService }

export interface BackgroundMeta {
    origin: 'content' | 'sidepanel'
    url?: string
}

const isMessage = (msg: unknown): msg is Message => checkMessage(msg as Partial<Message>)

const createOnMessage = (): OnMessage => (callback) => {
    const handler = (msg: unknown) => {
        if (isMessage(msg)) callback(msg)
    }
    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
}

const createOnMessageWithMeta =
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    <M extends Record<string, any>>(): OnMessage<M> =>
        (callback) => {
            const handler = (msg: unknown) => {
                // isMessage で Message 型に絞り込んだうえで、ジェネリックメタ M を付与する。
                // M の実行時検証は行わないため、呼び出し側で型を保証すること。
                if (isMessage(msg)) callback(msg as Message<M>)
            }
            browser.runtime.onMessage.addListener(handler)
            return () => browser.runtime.onMessage.removeListener(handler)
        }

export const createContentProvideAdapter = (): Adapter => ({
    sendMessage: (message) => {
        browser.runtime.sendMessage(message).catch(() => {})
    },
    onMessage: createOnMessage(),
})

export const createContentInjectAdapter = (tabId: number, frameId?: number): Adapter => ({
    sendMessage: (message) => {
        const options = frameId !== undefined ? { frameId } : undefined
        browser.tabs.sendMessage(tabId, message, options).catch(() => {})
    },
    onMessage: createOnMessage(),
})

export const createBackgroundProvideAdapter = (): Adapter<BackgroundMeta> => ({
    sendMessage: async (message) => {
        if (message.meta?.origin === 'content' && message.meta.url) {
            const tabs = await browser.tabs.query({ url: message.meta.url })
            for (const tab of tabs)
                if (tab.id !== undefined) browser.tabs.sendMessage(tab.id, message).catch(() => {})
        } else browser.runtime.sendMessage(message).catch(() => {})
    },
    onMessage: createOnMessageWithMeta<BackgroundMeta>(),
})

export const createBackgroundInjectAdapter = (
    origin: 'content' | 'sidepanel',
): Adapter<BackgroundMeta> => ({
    sendMessage: (message) => {
        const meta: BackgroundMeta =
            origin === 'content' ? { origin, url: location.href } : { origin }
        browser.runtime.sendMessage({ ...message, meta }).catch(() => {})
    },
    onMessage: createOnMessageWithMeta<BackgroundMeta>(),
})
