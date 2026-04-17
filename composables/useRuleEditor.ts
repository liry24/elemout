interface NewRuleTemplate {
    label: string
    sitePattern: string
    patternType: 'glob' | 'regex'
    selectors: string[]
    enabled: boolean
}

export const useRuleEditor = () => {
    const { currentHost } = useTabElements()
    const { createRule, editRule } = useRules()

    const newRuleTemplate = ref<NewRuleTemplate | null>(null)
    const editingRuleId = ref<string | null>(null)
    const pendingConvertHost = ref('')
    const pendingConvertIds = ref<string[]>([])
    const rulesSectionEl = ref<HTMLElement | null>(null)

    const newRuleObj = computed((): Rule | null => {
        if (!newRuleTemplate.value) return null
        return { id: '', timestamp: 0, ...newRuleTemplate.value }
    })

    const openNewRuleForm = (preset?: Partial<NewRuleTemplate>) => {
        editingRuleId.value = null
        newRuleTemplate.value = {
            label: '',
            sitePattern: currentHost.value,
            patternType: 'glob',
            selectors: [''],
            enabled: true,
            ...preset,
        }
        nextTick(() => rulesSectionEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }

    const openEditForm = (id: string) => {
        newRuleTemplate.value = null
        editingRuleId.value = id
        pendingConvertHost.value = ''
        pendingConvertIds.value = []
    }

    const cancelNewRule = () => {
        newRuleTemplate.value = null
        pendingConvertHost.value = ''
        pendingConvertIds.value = []
    }

    const handleRuleSave = async (rule: Rule) => {
        if (!rule.id) {
            const { id: _id, timestamp: _ts, ...data } = rule
            await createRule(data)
            newRuleTemplate.value = null
            if (pendingConvertHost.value && pendingConvertIds.value.length) {
                await removeHostElements(pendingConvertHost.value, pendingConvertIds.value)
                pendingConvertHost.value = ''
                pendingConvertIds.value = []
            }
        } else {
            await editRule(rule)
            editingRuleId.value = null
        }
    }

    /** ルール化フォームを開く（HiddenElement → Rule 変換フロー） */
    const startConvert = (
        elements: Pick<HiddenElement, 'id' | 'selector'>[],
        sitePattern: string,
    ) => {
        pendingConvertHost.value = sitePattern
        pendingConvertIds.value = elements.map((el) => el.id)
        openNewRuleForm({
            selectors: elements.map((el) => el.selector),
            sitePattern,
        })
    }

    return {
        newRuleObj,
        editingRuleId,
        rulesSectionEl,
        openNewRuleForm,
        openEditForm,
        cancelNewRule,
        handleRuleSave,
        startConvert,
    }
}
