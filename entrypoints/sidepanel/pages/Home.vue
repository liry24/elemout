<script lang="ts" setup>
import { Icon } from '@iconify/vue'

import HiddenElementItem from '@/components/HiddenElementItem.vue'
import RuleEditForm from '@/components/RuleEditForm.vue'
import RuleItem from '@/components/RuleItem.vue'

const router = useRouter()

const { success } = useStatus()
const {
    hiddenElements,
    currentHost,
    isSelecting,
    toggleSelecting,
    restoreElement,
    restoreElements,
    isEnabled,
    toggleEnabled,
    previewElement,
    endPreview,
} = useTabElements()
const {
    selectedIds,
    hasSelection,
    toggle: handleElementSelect,
    clear: clearSelection,
} = useMultiSelect()
const { currentRules, removeRule, toggleRule } = useRules()
const {
    newRuleObj,
    editingRuleId,
    openNewRuleForm,
    openEditForm,
    cancelNewRule,
    handleRuleSave,
    startConvert,
} = useRuleEditor()

const convertSelected = () => {
    const elements = hiddenElements.value.filter((el) => selectedIds.value.has(el.id))
    if (!elements.length) return
    startConvert(elements, currentHost.value)
    clearSelection()
}

const restoreSelected = async () => {
    await restoreElements([...selectedIds.value])
    clearSelection()
}
</script>

<template>
    <div class="flex h-screen flex-col select-none">
        <header v-if="currentHost" class="flex items-center gap-1 border-b border-zinc-700/50 p-3">
            <template v-if="hasSelection">
                <button
                    :aria-label="i18n.t('home.clearSelection')"
                    :title="i18n.t('home.clearSelection')"
                    class="btn btn-ghost btn-square"
                    @click="clearSelection()"
                >
                    <Icon icon="mingcute:close-line" width="18" />
                </button>

                <span class="text-base-content/60 grow font-mono text-xs">
                    {{ i18n.t('home.selectedCount', [String(selectedIds.size)]) }}
                </span>

                <button class="btn btn-soft btn-sm" @click="convertSelected">
                    {{ i18n.t('rules.convertToRule') }}
                </button>
                <button class="btn btn-soft btn-sm" @click="restoreSelected">
                    {{ i18n.t('element.restore') }}
                </button>
            </template>

            <template v-else>
                <button
                    :aria-label="
                        isSelecting ? i18n.t('home.stopSelection') : i18n.t('home.selectElement')
                    "
                    :class="
                        cn('btn btn-soft btn-square', isSelecting ? 'btn-error' : 'btn-primary')
                    "
                    :title="
                        isSelecting ? i18n.t('home.stopSelection') : i18n.t('home.selectElement')
                    "
                    @click="toggleSelecting"
                >
                    <Icon
                        :icon="isSelecting ? 'mingcute:stop-fill' : 'mingcute:cursor-3-fill'"
                        width="18"
                    />
                </button>

                <div class="mx-2 grid gap-0.5 font-mono text-xs">
                    <span :title="currentHost" class="text-base-content truncate">
                        {{ currentHost }}
                    </span>

                    <span class="text-base-content/60">
                        {{
                            i18n.t('home.summary', [
                                String(hiddenElements.length),
                                String(currentRules.length),
                            ])
                        }}
                    </span>
                </div>

                <button
                    :disabled="!isEnabled"
                    :aria-label="i18n.t('rules.addRule')"
                    :title="i18n.t('rules.addRule')"
                    class="btn btn-ghost btn-primary btn-square ml-auto"
                    @click="openNewRuleForm()"
                >
                    <Icon icon="mingcute:classify-add-fill" width="18" />
                </button>
            </template>
        </header>

        <main class="flex flex-1 flex-col overflow-y-auto">
            <div
                v-if="!currentHost"
                class="text-base-content/60 flex h-full items-center justify-center text-sm"
            >
                {{ i18n.t('home.openHttpPage') }}
            </div>

            <template v-else>
                <div class="flex grow flex-col">
                    <!-- Hidden elements list -->
                    <ul class="divide-base-content/10 divide-y empty:hidden">
                        <template v-if="!hasSelection" v-for="rule in currentRules" :key="rule.id">
                            <RuleEditForm
                                v-if="editingRuleId === rule.id"
                                :rule="rule"
                                @save="handleRuleSave"
                                @cancel="editingRuleId = null"
                                @preview="previewElement"
                                @end-preview="endPreview"
                            />
                            <RuleItem
                                v-else
                                :rule="rule"
                                @edit="openEditForm(rule.id)"
                                @delete="removeRule(rule.id)"
                                @toggle="toggleRule(rule.id)"
                                @preview="(sels) => sels.forEach(previewElement)"
                                @end-preview="(sels) => sels.forEach(endPreview)"
                            />
                        </template>
                        <HiddenElementItem
                            v-for="el in hiddenElements"
                            :key="el.id"
                            :element="el"
                            :current-host="currentHost"
                            :selected="selectedIds.has(el.id)"
                            :is-selection-mode="hasSelection"
                            @restore="restoreElement(el.id)"
                            @preview="previewElement(el.selector)"
                            @end-preview="endPreview(el.selector)"
                            @select="handleElementSelect(el.id)"
                            @convert="(element, host) => startConvert([element], host)"
                        />
                    </ul>

                    <ul v-if="newRuleObj" class="px-2 pb-2">
                        <RuleEditForm
                            :rule="newRuleObj"
                            :is-new="true"
                            @save="handleRuleSave"
                            @cancel="cancelNewRule"
                            @preview="previewElement"
                            @end-preview="endPreview"
                        />
                    </ul>

                    <div
                        v-else-if="hiddenElements.length === 0 && currentRules.length === 0"
                        class="text-base-content/60 flex grow flex-col items-center justify-center gap-3 px-3 py-6 text-sm"
                    >
                        {{ i18n.t('home.noHiddenElements') }}

                        <button class="btn btn-soft" @click="toggleSelecting">
                            <Icon icon="mingcute:cursor-3-fill" width="18" />
                            <span>{{ i18n.t('home.selectElement') }}</span>
                        </button>

                        <button class="btn btn-soft" @click="openNewRuleForm()">
                            <Icon icon="mingcute:classify-add-fill" width="18" />
                            <span>{{ i18n.t('rules.addRule') }}</span>
                        </button>
                    </div>
                </div>
            </template>
        </main>

        <footer class="border-base-content/10 flex items-center gap-3 border-t px-3 py-2">
            <input
                type="checkbox"
                :checked="isEnabled"
                :aria-label="i18n.t('home.enableHiding')"
                class="toggle toggle-primary toggle-sm"
                @change="toggleEnabled"
            />

            <p v-if="success" class="text-xs text-emerald-400">
                {{ success }}
            </p>

            <button
                type="button"
                :aria-label="i18n.t('settings.openSettings')"
                :title="i18n.t('settings.openSettings')"
                class="btn btn-ghost btn-square btn-sm ml-auto"
                @click="router.push('/settings')"
            >
                <Icon icon="mingcute:settings-1-fill" width="18" class="size-4.5 shrink-0" />
            </button>
        </footer>
    </div>
</template>
