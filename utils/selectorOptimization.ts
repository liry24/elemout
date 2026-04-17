const MIN_SHARED_PREFIX_LENGTH = 4
const TOKEN_BOUNDARIES = ['-', '_', '/', ':', '.'] as const

interface AttributeSelectorValue {
    name: string
    value: string
}

const commonPrefix = (strings: string[]): string => {
    if (!strings.length) return ''

    let prefix = strings[0]
    for (let index = 1; index < strings.length; index++) {
        while (!strings[index].startsWith(prefix)) {
            prefix = prefix.slice(0, -1)
            if (!prefix) return ''
        }
    }

    return prefix
}

const normalizeSharedPrefix = (value: string): string => {
    if (value.length < MIN_SHARED_PREFIX_LENGTH) return ''

    const lastChar = value[value.length - 1]
    if (lastChar && TOKEN_BOUNDARIES.includes(lastChar as (typeof TOKEN_BOUNDARIES)[number]))
        return value

    const lastBoundary = TOKEN_BOUNDARIES.reduce(
        (currentMax, boundary) => Math.max(currentMax, value.lastIndexOf(boundary)),
        -1,
    )

    if (lastBoundary === -1) return value

    const trailingFragment = value.slice(lastBoundary + 1)
    if (trailingFragment.length >= 3 || /^\d+$/.test(trailingFragment)) return value

    return value.slice(0, lastBoundary + 1)
}

const decodeCssEscape = (input: string, startIndex: number) => {
    if (input[startIndex] !== '\\' || startIndex >= input.length - 1) return null

    const hexMatch = input.slice(startIndex + 1).match(/^[\dA-Fa-f]{1,6}(?:\r\n|[ \t\r\n\f])?/)?.[0]
    if (hexMatch) {
        const codePoint = Number.parseInt(hexMatch.trimEnd(), 16)
        const decoded =
            codePoint === 0 || codePoint > 0x10ffff ? '\uFFFD' : String.fromCodePoint(codePoint)
        return {
            value: decoded,
            nextIndex: startIndex + 1 + hexMatch.length,
        }
    }

    const nextChar = input[startIndex + 1]
    if (nextChar === '\r' && input[startIndex + 2] === '\n') {
        return {
            value: '',
            nextIndex: startIndex + 3,
        }
    }

    if (nextChar === '\r' || nextChar === '\n' || nextChar === '\f') {
        return {
            value: '',
            nextIndex: startIndex + 2,
        }
    }

    return {
        value: nextChar,
        nextIndex: startIndex + 2,
    }
}

const decodeCssIdentifier = (input: string): string | null => {
    if (!input) return null

    let decoded = ''

    for (let index = 0; index < input.length; ) {
        const char = input[index]
        if (char === '\\') {
            const escaped = decodeCssEscape(input, index)
            if (!escaped || /\s/.test(escaped.value)) return null
            decoded += escaped.value
            index = escaped.nextIndex
            continue
        }

        if (/\s/.test(char) || '#.[]:>+~,*(){}'.includes(char)) return null

        decoded += char
        index += 1
    }

    return decoded || null
}

const decodeCssString = (input: string): string | null => {
    let decoded = ''

    for (let index = 0; index < input.length; ) {
        const char = input[index]
        if (char === '\\') {
            const escaped = decodeCssEscape(input, index)
            if (!escaped) return null
            decoded += escaped.value
            index = escaped.nextIndex
            continue
        }

        decoded += char
        index += 1
    }

    return decoded
}

const decodeUnquotedAttributeValue = (input: string): string | null => {
    if (!input) return null

    let decoded = ''

    for (let index = 0; index < input.length; ) {
        const char = input[index]
        if (char === '\\') {
            const escaped = decodeCssEscape(input, index)
            if (!escaped || /\s/.test(escaped.value)) return null
            decoded += escaped.value
            index = escaped.nextIndex
            continue
        }

        if (/\s/.test(char) || char === ']' || char === '"' || char === "'") return null

        decoded += char
        index += 1
    }

    return decoded || null
}

const extractSimpleIdSelector = (selector: string) =>
    selector.startsWith('#') ? decodeCssIdentifier(selector.slice(1)) : null

const extractSimpleClassSelector = (selector: string) =>
    selector.startsWith('.') ? decodeCssIdentifier(selector.slice(1)) : null

const extractSimpleAttributeSelector = (selector: string): AttributeSelectorValue | null => {
    if (!selector.startsWith('[') || !selector.endsWith(']')) return null

    const inner = selector.slice(1, -1).trim()
    if (!inner) return null

    let quote: '"' | "'" | null = null
    let operatorIndex = -1

    for (let index = 0; index < inner.length; index++) {
        const char = inner[index]
        if (char === '\\') {
            const escaped = decodeCssEscape(inner, index)
            if (!escaped) return null
            index = escaped.nextIndex - 1
            continue
        }
        if (quote) {
            if (char === quote) quote = null
            continue
        }
        if (char === '"' || char === "'") {
            quote = char
            continue
        }
        if (char === '=') {
            operatorIndex = index
            break
        }
    }

    if (operatorIndex === -1 || quote) return null

    const name = inner.slice(0, operatorIndex).trim()
    if (!name || /[~|^$*!]$/.test(name) || /[\s"'\\\]]/.test(name)) return null

    const rawValue = inner.slice(operatorIndex + 1).trim()
    if (!rawValue) return null

    if (
        (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'"))
    ) {
        const value = decodeCssString(rawValue.slice(1, -1))
        return value == null ? null : { name, value }
    }

    if (rawValue.includes('"') || rawValue.includes("'")) return null

    const value = decodeUnquotedAttributeValue(rawValue)
    return value == null ? null : { name, value }
}

const escapeCssString = (value: string) =>
    value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\A ')
        .replace(/\r/g, '\\D ')
        .replace(/\f/g, '\\C ')

const getSharedPrefix = (values: string[]) => normalizeSharedPrefix(commonPrefix(values))

export const suggestOptimizedSelector = (selectors: string[]): string | null => {
    if (selectors.length < 2) return null

    const idValues = selectors.map(extractSimpleIdSelector)
    if (idValues.every((value): value is string => value != null)) {
        const prefix = getSharedPrefix(idValues)
        if (prefix.length >= MIN_SHARED_PREFIX_LENGTH) return `[id^="${escapeCssString(prefix)}"]`
    }

    const classValues = selectors.map(extractSimpleClassSelector)
    if (classValues.every((value): value is string => value != null)) {
        const prefix = getSharedPrefix(classValues)
        if (prefix.length >= MIN_SHARED_PREFIX_LENGTH)
            return `[class*="${escapeCssString(prefix)}"]`
    }

    const attrValues = selectors.map(extractSimpleAttributeSelector)
    if (attrValues.every((value): value is AttributeSelectorValue => value != null))
        if (new Set(attrValues.map((value) => value.name)).size === 1) {
            const prefix = getSharedPrefix(attrValues.map((value) => value.value))
            if (prefix.length >= MIN_SHARED_PREFIX_LENGTH)
                return `[${attrValues[0].name}^="${escapeCssString(prefix)}"]`
        }

    return null
}
