<script lang="ts" setup>
import { Icon } from '@iconify/vue'

interface Props {
    rule: Rule
    isNew?: boolean
}
const { rule, isNew } = defineProps<Props>()

interface Emits {
    save: [rule: Rule]
    cancel: []
    preview: [selector: string]
    'end-preview': [selector: string]
}
const emit = defineEmits<Emits>()

interface FormData {
    label: string
    patternType: 'glob' | 'regex'
    sitePattern: string
    selectors: string[]
}

const makeForm = (): FormData => ({
    label: rule.label ?? '',
    patternType: rule.patternType,
    sitePattern: rule.sitePattern,
    selectors:
        Array.isArray(rule.selectors) && rule.selectors.length > 0 ? [...rule.selectors] : [''],
})

const form = reactive<FormData>(makeForm())
const formError = ref('')

const getRuleErrorMessage = (issue: RuleValidationIssue) => {
    switch (issue) {
        case 'pattern-too-long':
            return i18n.t('rules.form.errorPatternTooLong')
        case 'invalid-regex':
            return i18n.t('rules.form.errorInvalidRegex')
        case 'unsafe-regex':
            return i18n.t('rules.form.errorUnsafeRegex')
        case 'too-many-selectors':
            return i18n.t('rules.form.errorTooManySelectors')
        case 'selector-too-long':
            return i18n.t('rules.form.errorSelectorTooLong')
        case 'invalid-selector':
            return i18n.t('rules.form.errorInvalidSelector')
        case 'empty-selectors':
            return i18n.t('rules.form.errorSelectors')
        case 'empty-pattern':
        default:
            return i18n.t('rules.form.errorPattern')
    }
}

const isRegex = computed({
    get: () => form.patternType === 'regex',
    set: (val: boolean) => {
        form.patternType = val ? 'regex' : 'glob'
    },
})

const cancelEdit = () => {
    formError.value = ''
    emit('cancel')
}

const addSelector = () => {
    form.selectors.push('')
}

const removeSelector = (index: number) => {
    form.selectors.splice(index, 1)
}

const saveRule = () => {
    const cleanSelectors = form.selectors.map((s) => s.trim()).filter(Boolean)
    const issue = validateRuleInput(
        {
            patternType: form.patternType,
            sitePattern: form.sitePattern,
            selectors: cleanSelectors,
        },
        document,
    )
    if (issue) {
        formError.value = getRuleErrorMessage(issue)
        return
    }
    const saved: Rule = {
        ...rule,
        label: form.label.trim() || undefined,
        patternType: form.patternType,
        sitePattern: form.sitePattern.trim(),
        selectors: sanitizeSelectors(cleanSelectors, document),
    }
    emit('save', saved)
    formError.value = ''
}

// ─── ライブプレビュー ─────────────────────────────────────────────────────────
const activePreviewSelectors = ref<string[]>([])

const validSelectors = computed(() => sanitizeSelectors(form.selectors, document))

watch(
    validSelectors,
    (newSels, oldSels) => {
        const prev = oldSels ?? []
        for (const sel of prev) {
            if (!newSels.includes(sel)) emit('end-preview', sel)
        }
        for (const sel of newSels) {
            if (!prev.includes(sel)) emit('preview', sel)
        }
        activePreviewSelectors.value = newSels
    },
    { immediate: true },
)

onUnmounted(() => {
    for (const sel of activePreviewSelectors.value) emit('end-preview', sel)
})

// ─── 最適化提案 ────────────────────────────────────────────────────────────────
const optimizationSuggestion = computed(() => suggestOptimizedSelector(validSelectors.value))

const applyOptimization = () => {
    if (!optimizationSuggestion.value) return
    form.selectors = [optimizationSuggestion.value]
}
</script>

<template>
    <li class="bg-base-300 my-2 grid gap-2 rounded-lg p-3">
        <h2 class="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Icon icon="mingcute:classify-add-fill" width="18" />
            {{ isNew ? i18n.t('rules.newRule') : i18n.t('rules.editRule') }}
        </h2>

        <!-- label -->
        <fieldset class="fieldset">
            <legend class="label">{{ i18n.t('rules.form.label') }}</legend>
            <input
                type="text"
                v-model="form.label"
                :placeholder="i18n.t('rules.form.labelPlaceholder')"
                class="input input-sm"
            />
        </fieldset>

        <div class="divider my-0" />

        <!-- site pattern -->
        <fieldset class="fieldset">
            <legend class="label">{{ i18n.t('rules.form.sitePattern') }}</legend>
            <input
                type="text"
                v-model="form.sitePattern"
                :placeholder="
                    isRegex
                        ? i18n.t('rules.form.sitePatternRegexHint')
                        : i18n.t('rules.form.sitePatternGlobHint')
                "
                class="input input-sm font-mono"
            />
            <label class="label">
                <input type="checkbox" v-model="isRegex" class="checkbox checkbox-xs" />
                {{ i18n.t('rules.form.useRegex') }}
            </label>
        </fieldset>

        <div class="divider my-0" />

        <!-- selectors -->
        <fieldset class="fieldset">
            <div class="flex items-center gap-1">
                <legend class="label">{{ i18n.t('rules.form.selectors') }}</legend>
                <a
                    href="/help.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    :aria-label="i18n.t('rules.form.selectorHelpButton')"
                    :title="i18n.t('rules.form.selectorHelpButton')"
                    class="btn btn-ghost btn-square btn-xs"
                >
                    <Icon icon="mingcute:question-line" width="16" class="shrink-0" />
                </a>
            </div>
            <div class="space-y-1.5">
                <div
                    v-if="optimizationSuggestion"
                    class="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-400"
                >
                    <Icon icon="mingcute:magic-2-line" width="14" class="shrink-0" />
                    <span class="min-w-0 flex-1 truncate font-mono">{{
                        optimizationSuggestion
                    }}</span>
                    <button
                        type="button"
                        class="btn btn-xs btn-ghost shrink-0 text-amber-400"
                        @click="applyOptimization"
                    >
                        {{ i18n.t('rules.form.applyOptimization') }}
                    </button>
                </div>
                <div v-for="(_, i) in form.selectors" :key="i" class="flex items-center gap-1">
                    <input
                        v-model="form.selectors[i]"
                        type="text"
                        :placeholder="i18n.t('rules.form.selectorPlaceholder')"
                        class="input input-sm font-mono"
                    />
                    <button
                        v-if="form.selectors.length > 1"
                        :aria-label="i18n.t('rules.form.removeSelector')"
                        :title="i18n.t('rules.form.removeSelector')"
                        type="button"
                        class="btn btn-ghost btn-square btn-xs"
                        @click="removeSelector(i)"
                    >
                        <Icon icon="mingcute:close-line" width="14" />
                    </button>
                </div>
                <button type="button" class="btn btn-ghost btn-xs" @click="addSelector">
                    <Icon icon="mingcute:add-line" width="12" />
                    {{ i18n.t('rules.form.addSelector') }}
                </button>
            </div>
        </fieldset>

        <!-- error -->
        <p v-if="formError" class="text-xs text-rose-400">{{ formError }}</p>

        <!-- actions -->
        <div class="flex justify-end gap-0.5">
            <button class="btn btn-ghost btn-sm" type="button" @click="cancelEdit">
                {{ i18n.t('rules.form.cancel') }}
            </button>
            <button class="btn btn-sm btn-neutral" type="button" @click="saveRule">
                {{ i18n.t('rules.form.save') }}
            </button>
        </div>
    </li>
</template>
