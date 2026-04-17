const rules = ref<Rule[]>([])
let rulesUsers = 0
let stopRulesWatch: (() => void) | null = null
let rulesLoadPromise: Promise<void> | null = null

const retainRulesState = () => {
    rulesUsers += 1
    rulesLoadPromise ??= elementRulesData.getValue().then((val) => {
        rules.value = val
    })
    stopRulesWatch ??= elementRulesData.watch((newRules) => {
        rules.value = newRules ?? []
    })
}

const releaseRulesState = () => {
    rulesUsers = Math.max(0, rulesUsers - 1)
    if (rulesUsers > 0) return
    stopRulesWatch?.()
    stopRulesWatch = null
    rulesLoadPromise = null
}

// ── Actions ───────────────────────────────────────────────────────────────────
const createRule = async (data: Omit<Rule, 'id' | 'timestamp'>) => {
    const rule: Rule = { ...data, id: crypto.randomUUID(), timestamp: Date.now() }
    await addRule(rule)
}

const toggleRule = async (id: string) => {
    const rule = rules.value.find((r) => r.id === id)
    if (!rule) return
    await updateRule({ ...toRaw(rule), enabled: !rule.enabled })
}

// ── Composable (callable multiple times, no side effects) ─────────────────────
export const useRules = () => {
    const { currentHost } = useTabElements()

    onMounted(() => {
        retainRulesState()
    })

    onUnmounted(() => {
        releaseRulesState()
    })

    const currentRules = computed(() =>
        [...rules.value]
            .filter((rule) => matchesPattern(currentHost.value, rule.sitePattern, rule.patternType))
            .sort((a, b) => getRuleSpecificity(b) - getRuleSpecificity(a)),
    )

    return {
        currentRules,
        createRule,
        editRule: updateRule,
        removeRule: deleteRule,
        toggleRule,
    }
}
