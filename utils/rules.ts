export const elementRulesData = storage.defineItem<Rule[]>('local:elementRulesData', {
    fallback: [],
})

export const MAX_SITE_PATTERN_LENGTH = 200
export const MAX_SELECTOR_LENGTH = 512
export const MAX_RULE_SELECTORS = 32

export type RuleValidationIssue =
    | 'empty-pattern'
    | 'pattern-too-long'
    | 'invalid-regex'
    | 'unsafe-regex'
    | 'empty-selectors'
    | 'too-many-selectors'
    | 'selector-too-long'
    | 'invalid-selector'

const hasUnsafeRegexShape = (pattern: string) => {
    if (/\\[1-9]/.test(pattern)) return true
    return /\((?:\?:)?(?:[^()\\]|\\.)*[+*{](?:[^()\\]|\\.)*\)[+*{]/.test(pattern)
}

let selectorValidationDoc: Document | null | undefined

const getSelectorValidationDoc = () => {
    if (globalThis.document) return globalThis.document
    if (selectorValidationDoc !== undefined) return selectorValidationDoc
    if (typeof DOMParser === 'undefined') {
        selectorValidationDoc = null
        return selectorValidationDoc
    }
    selectorValidationDoc = new DOMParser().parseFromString(
        '<!doctype html><html><body></body></html>',
        'text/html',
    )
    return selectorValidationDoc
}

export const isValidCssSelector = (selector: string, doc = getSelectorValidationDoc()) => {
    const normalized = selector.trim()
    if (!normalized || normalized.length > MAX_SELECTOR_LENGTH) return false
    if (!doc?.createElement) return true
    try {
        doc.createElement('div').querySelector(normalized)
        return true
    } catch {
        return false
    }
}

export const sanitizeSelectors = (
    selectors: readonly string[],
    doc = getSelectorValidationDoc(),
) => {
    const result: string[] = []
    const seen = new Set<string>()
    for (const selector of selectors) {
        const normalized = selector.trim()
        if (!normalized || seen.has(normalized) || !isValidCssSelector(normalized, doc)) continue
        seen.add(normalized)
        result.push(normalized)
    }
    return result
}

export const validateSitePattern = (
    pattern: string,
    type: 'glob' | 'regex',
): RuleValidationIssue | null => {
    const normalized = pattern.trim()
    if (!normalized) return 'empty-pattern'
    if (normalized.length > MAX_SITE_PATTERN_LENGTH) return 'pattern-too-long'
    if (type === 'regex') {
        try {
            new RegExp(normalized)
        } catch {
            return 'invalid-regex'
        }
        if (hasUnsafeRegexShape(normalized)) return 'unsafe-regex'
    }
    return null
}

export const validateRuleInput = (
    input: Pick<Rule, 'patternType' | 'sitePattern' | 'selectors'>,
    doc = getSelectorValidationDoc(),
): RuleValidationIssue | null => {
    const patternIssue = validateSitePattern(input.sitePattern, input.patternType)
    if (patternIssue) return patternIssue

    const normalizedSelectors = input.selectors.map((selector) => selector.trim()).filter(Boolean)
    if (normalizedSelectors.length === 0) return 'empty-selectors'
    if (normalizedSelectors.length > MAX_RULE_SELECTORS) return 'too-many-selectors'

    for (const selector of normalizedSelectors) {
        if (selector.length > MAX_SELECTOR_LENGTH) return 'selector-too-long'
        if (!isValidCssSelector(selector, doc)) return 'invalid-selector'
    }

    return null
}

const normalizeRule = (rule: Rule, doc = getSelectorValidationDoc()): Rule => ({
    ...rule,
    label: rule.label?.trim() || undefined,
    sitePattern: rule.sitePattern.trim(),
    selectors: sanitizeSelectors(rule.selectors, doc),
})

export const sanitizeRules = (rules: readonly Rule[], doc = getSelectorValidationDoc()) => {
    const result: Rule[] = []
    const seen = new Set<string>()

    for (const rule of rules) {
        const normalized = normalizeRule(
            {
                ...rule,
                id: rule.id?.trim() || crypto.randomUUID(),
                patternType: rule.patternType === 'regex' ? 'regex' : 'glob',
                enabled: Boolean(rule.enabled),
                timestamp: Number.isFinite(rule.timestamp) ? rule.timestamp : Date.now(),
            },
            doc,
        )
        const issue = validateRuleInput(normalized, doc)
        if (issue || seen.has(normalized.id)) continue
        seen.add(normalized.id)
        result.push(normalized)
    }

    return result
}

const assertRuleInput = (rule: Rule, doc = getSelectorValidationDoc()): Rule => {
    const [normalized] = sanitizeRules([rule], doc)
    if (!normalized) throw new Error('Invalid rule input')
    return normalized
}

/** グロブまたは正規表現パターンとホスト名のマッチング */
export const matchesPattern = (hostname: string, pattern: string, type: 'glob' | 'regex') => {
    if (validateSitePattern(pattern, type)) return false

    if (type === 'regex')
        try {
            return new RegExp(pattern).test(hostname)
        } catch {
            return false
        }

    // glob
    if (pattern === '*') return true
    // * → [^.]* に変換（ドット以外の任意文字列）
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]*')
    try {
        return new RegExp(`^${escaped}$`).test(hostname)
    } catch {
        return false
    }
}

/** ホスト名にマッチする有効なルールのセレクタをすべて返す */
export const getMatchingSelectors = (hostname: string, rules: Rule[]) => {
    const result: string[] = []
    for (const rule of rules) {
        if (!rule.enabled) continue
        if (matchesPattern(hostname, rule.sitePattern, rule.patternType))
            result.push(...sanitizeSelectors(rule.selectors))
    }
    return result
}

export const addRule = async (rule: Rule) => {
    const rules = await elementRulesData.getValue()
    rules.push(assertRuleInput(rule))
    await elementRulesData.setValue(rules)
}

export const updateRule = async (updated: Rule) => {
    const rules = await elementRulesData.getValue()
    const idx = rules.findIndex((r) => r.id === updated.id)
    if (idx !== -1) {
        rules[idx] = assertRuleInput(updated)
        await elementRulesData.setValue(rules)
    }
}

export const deleteRule = async (id: string) => {
    const rules = await elementRulesData.getValue()
    await elementRulesData.setValue(rules.filter((r) => r.id !== id))
}

/**
 * ルールの specificity スコアを返す（高いほど具体的・先に表示）
 * 完全一致ホスト名(3) > サブドメイン glob(2) > 全ワイルドカード *(1) > regex(0)
 */
export const getRuleSpecificity = (rule: Rule): number => {
    if (rule.patternType === 'regex') return 0
    if (rule.sitePattern === '*') return 1
    if (rule.sitePattern.includes('*')) return 2 // e.g., *.example.com
    return 3 // exact hostname
}
