export const elementHideData = storage.defineItem<StorageData>('local:elementHideData', {
    fallback: {},
})
export const hideEnabled = storage.defineItem<boolean>('local:hideEnabled', { fallback: true })
export const wheelInverted = storage.defineItem<boolean>('local:wheelInverted', { fallback: false })
export const wheelDeadzone = storage.defineItem<number>('local:wheelDeadzone', { fallback: 40 })
export const gistBackupEnabled = storage.defineItem<boolean>('local:gistBackupEnabled', {
    fallback: false,
})
export const includeSettingsInSync = storage.defineItem<boolean>('local:includeSettingsInSync', {
    fallback: true,
})
export const showSelectorPreview = storage.defineItem<boolean>('local:showSelectorPreview', {
    fallback: false,
})
export const scrollModeKey = storage.defineItem<string>('local:scrollModeKey', { fallback: 'S' })
export const selectionStartKey = storage.defineItem<string>('local:selectionStartKey', {
    fallback: '',
})

export const selectingFlag = storage.defineItem<boolean>('session:selectingFlag', {
    fallback: false,
})

const normalizeShortcut = (value: string, fallback: string, allowEmpty = false) => {
    const normalized = typeof value === 'string' ? value.trim() : ''
    if (!normalized) return allowEmpty ? '' : fallback
    return normalized.slice(0, 64)
}

export const sanitizeHiddenElement = (element: HiddenElement): HiddenElement | null => {
    const selector = typeof element.selector === 'string' ? element.selector.trim() : ''
    if (!selector || !isValidCssSelector(selector)) return null

    return {
        id:
            typeof element.id === 'string' && element.id.trim()
                ? element.id.trim()
                : crypto.randomUUID(),
        selector,
        timestamp: Number.isFinite(element.timestamp) ? element.timestamp : Date.now(),
    }
}

export const sanitizeStorageData = (data: StorageData): StorageData => {
    const result: StorageData = {}

    for (const [host, elements] of Object.entries(data)) {
        const normalizedHost = host.trim()
        if (!normalizedHost || !Array.isArray(elements)) continue

        const safeElements: HiddenElement[] = []
        const seenIds = new Set<string>()
        for (const element of elements) {
            const safeElement = sanitizeHiddenElement(element)
            if (!safeElement || seenIds.has(safeElement.id)) continue
            seenIds.add(safeElement.id)
            safeElements.push(safeElement)
        }

        if (safeElements.length > 0) result[normalizedHost] = safeElements
    }

    return result
}

export const sanitizeSettings = (settings: Settings): Settings => ({
    wheelInverted: Boolean(settings.wheelInverted),
    wheelDeadzone: Number.isFinite(settings.wheelDeadzone)
        ? Math.max(0, Math.min(500, Math.round(settings.wheelDeadzone)))
        : wheelDeadzone.fallback,
    includeSettingsInSync: Boolean(settings.includeSettingsInSync),
    showSelectorPreview: Boolean(settings.showSelectorPreview),
    scrollModeKey: normalizeShortcut(settings.scrollModeKey, scrollModeKey.fallback),
    selectionStartKey: normalizeShortcut(
        settings.selectionStartKey,
        selectionStartKey.fallback,
        true,
    ),
})

export const addHostElement = async (host: string, element: HiddenElement) => {
    const normalizedHost = host.trim()
    const safeElement = sanitizeHiddenElement(element)
    if (!normalizedHost || !safeElement) return

    const data = sanitizeStorageData(await elementHideData.getValue())
    const list = data[normalizedHost] ?? []
    data[normalizedHost] = [...list.filter((item) => item.id !== safeElement.id), safeElement]
    await elementHideData.setValue(data)
}

export const removeHostElement = async (host: string, id: string) => {
    const data = await elementHideData.getValue()
    const nextData = removeHiddenElementsFromData(data, host, [id])
    const updated = nextData[host] ?? []
    await elementHideData.setValue(nextData)
    return updated
}

export const removeHostElements = async (host: string, ids: readonly string[]) => {
    if (!ids.length) return elementHideData.getValue().then((data) => data[host] ?? [])
    const data = sanitizeStorageData(await elementHideData.getValue())
    const nextData = removeHiddenElementsFromData(data, host, ids)
    const updated = nextData[host] ?? []
    await elementHideData.setValue(nextData)
    return updated
}

export const getSettings = async () => ({
    wheelInverted: await wheelInverted.getValue(),
    wheelDeadzone: await wheelDeadzone.getValue(),
    includeSettingsInSync: await includeSettingsInSync.getValue(),
    showSelectorPreview: await showSelectorPreview.getValue(),
    scrollModeKey: await scrollModeKey.getValue(),
    selectionStartKey: await selectionStartKey.getValue(),
})

export const applySettings = async (s: Settings) => {
    const safeSettings = sanitizeSettings(s)
    await wheelInverted.setValue(safeSettings.wheelInverted)
    await wheelDeadzone.setValue(safeSettings.wheelDeadzone)
    await includeSettingsInSync.setValue(safeSettings.includeSettingsInSync)
    await showSelectorPreview.setValue(safeSettings.showSelectorPreview)
    await scrollModeKey.setValue(safeSettings.scrollModeKey)
    await selectionStartKey.setValue(safeSettings.selectionStartKey)
}
