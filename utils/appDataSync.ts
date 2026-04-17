export const APP_GIST_DESCRIPTION = 'Elemout - Hidden Elements Data'

const sanitizeOptionalSettings = (settings: Settings | undefined): Settings | undefined =>
    settings === undefined ? undefined : sanitizeSettings(settings)

const stableSerializeStorageData = (data: StorageData): string => {
    const sorted: StorageData = {}
    for (const host of Object.keys(data).sort()) {
        const items = data[host] ?? []
        sorted[host] = [...items].sort((left, right) => left.id.localeCompare(right.id))
    }
    return JSON.stringify(sorted)
}

const stableSerializeRules = (rules: Rule[]): string =>
    JSON.stringify([...rules].sort((left, right) => left.id.localeCompare(right.id)))

const stableSerializeSettings = (settings: Settings): string =>
    JSON.stringify({
        wheelInverted: settings.wheelInverted,
        wheelDeadzone: settings.wheelDeadzone,
        includeSettingsInSync: settings.includeSettingsInSync,
        showSelectorPreview: settings.showSelectorPreview,
        scrollModeKey: settings.scrollModeKey,
        selectionStartKey: settings.selectionStartKey,
    })

let includeSettingsInSyncSnapshot = includeSettingsInSync.fallback

void includeSettingsInSync.getValue().then((value) => {
    includeSettingsInSyncSnapshot = value
})

includeSettingsInSync.watch((value) => {
    includeSettingsInSyncSnapshot = value
})

export const appDataFiles = {
    data: defineDataFile<StorageData>({
        filename: 'data.json',
        storage: storageItem(elementHideData),
        sanitize: sanitizeStorageData,
        merge: (local, remote) => {
            const result: StorageData = structuredClone(local)
            for (const [host, elements] of Object.entries(remote)) {
                const existingIds = new Set((result[host] ?? []).map((element) => element.id))
                const nextElements = elements.filter((element) => !existingIds.has(element.id))
                result[host] = [...(result[host] ?? []), ...nextElements]
            }
            return result
        },
        stableSerialize: stableSerializeStorageData,
    }),
    rules: defineDataFile<Rule[]>({
        filename: 'rules.json',
        storage: storageItem(elementRulesData),
        sanitize: (rules) => sanitizeRules(rules),
        merge: (local, remote) => {
            const map = new Map(local.map((rule) => [rule.id, rule]))
            for (const rule of remote) {
                const existing = map.get(rule.id)
                if (!existing || rule.timestamp > existing.timestamp) map.set(rule.id, rule)
            }
            return Array.from(map.values())
        },
        stableSerialize: stableSerializeRules,
    }),
    settings: defineDataFile<Settings | undefined, Settings>({
        filename: 'settings.json',
        storage: storageFields({
            wheelInverted,
            wheelDeadzone,
            includeSettingsInSync,
            showSelectorPreview,
            scrollModeKey,
            selectionStartKey,
        }),
        initial: undefined,
        sanitize: sanitizeOptionalSettings,
        merge: (_local, remote) => (!includeSettingsInSyncSnapshot ? undefined : remote),
        omit: () => !includeSettingsInSyncSnapshot,
        stableSerialize: stableSerializeSettings,
    }),
}

export type AppDataPayload = DataFileValues<typeof appDataFiles>

export const appDataSync = createDataOperations(appDataFiles, {
    gistDescription: APP_GIST_DESCRIPTION,
})
