export interface HiddenElement {
    id: string
    selector: string
    timestamp: number
}

export type StorageData = Record<string, HiddenElement[]>

export interface Settings {
    wheelInverted: boolean
    wheelDeadzone: number
    includeSettingsInSync: boolean
    showSelectorPreview: boolean
    scrollModeKey: string
    selectionStartKey: string
}

export interface Rule {
    id: string
    label?: string
    sitePattern: string
    patternType: 'glob' | 'regex'
    selectors: string[]
    enabled: boolean
    timestamp: number
}

export type Message =
    | { type: 'START_SELECTION' }
    | { type: 'STOP_SELECTION' }
    | { type: 'RESTORE_ELEMENT'; id: string; selector: string }
    | { type: 'PREVIEW_ELEMENT'; selector: string }
    | { type: 'END_PREVIEW'; selector: string }
    | { type: 'ELEMENT_HIDDEN'; element: HiddenElement; host: string }
    | { type: 'REQUEST_STATUS' }
    | { type: 'STATUS_RESPONSE'; isSelecting: boolean }
    | { type: 'SAVE_AND_NOTIFY'; element: HiddenElement }
    | { type: 'SET_HIDE_ENABLED'; enabled: boolean }
    | { type: 'SELECTION_STARTED' }
