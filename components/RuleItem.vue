<script lang="ts" setup>
import { Icon } from '@iconify/vue'

interface Props {
    rule: Rule
}
const { rule } = defineProps<Props>()

interface Emits {
    edit: []
    delete: [id: string]
    toggle: [id: string]
    preview: [selectors: string[]]
    'end-preview': [selectors: string[]]
}
const emit = defineEmits<Emits>()
</script>

<template>
    <li
        class="group hover:bg-base-content/10 relative flex items-center gap-2.5 py-2 pr-1 pl-2.5 transition-colors"
        @mouseenter="emit('preview', rule.selectors)"
        @mouseleave="emit('end-preview', rule.selectors)"
    >
        <input
            type="checkbox"
            :checked="rule.enabled"
            :aria-label="i18n.t('rules.toggleRule', [rule.label?.trim() || rule.sitePattern])"
            class="toggle toggle-xs"
            @change="emit('toggle', rule.id)"
        />

        <div class="flex min-w-0 grow flex-col gap-0.5">
            <p v-if="rule.label" class="text-base-content truncate text-xs">
                {{ rule.label?.trim() }}
            </p>
            <p v-else class="text-base-content/60 truncate text-xs">
                {{ i18n.t('rules.unnamed') }}
            </p>

            <p class="text-base-content/70 truncate font-mono text-xs">
                {{ rule.sitePattern }}
            </p>
        </div>

        <button
            :aria-label="i18n.t('rules.moreActions', [rule.label?.trim() || rule.sitePattern])"
            :popovertarget="`popover-${rule.id}`"
            :style="`anchor-name: --anchor-${rule.id}`"
            class="btn btn-ghost btn-square btn-sm opacity-0 transition-opacity group-hover:opacity-100"
            :title="i18n.t('rules.moreActions', [rule.label?.trim() || rule.sitePattern])"
            @click.stop
        >
            <Icon icon="mingcute:more-2-line" size="18" class="size-4.5 shrink-0" />
        </button>
        <ul
            class="dropdown menu rounded-box bg-base-300 w-52 shadow-sm"
            popover
            :id="`popover-${rule.id}`"
            :style="`position-anchor: --anchor-${rule.id}`"
        >
            <li>
                <button
                    :aria-label="i18n.t('rules.edit')"
                    :title="i18n.t('rules.edit')"
                    class="btn btn-ghost btn-square w-full justify-start"
                    @click.stop="emit('edit')"
                >
                    <Icon icon="mingcute:list-check-fill" size="18" class="shrink-0" />
                    {{ i18n.t('rules.edit') }}
                </button>
            </li>
            <li>
                <button
                    :aria-label="i18n.t('rules.delete')"
                    :title="i18n.t('rules.delete')"
                    class="btn btn-ghost btn-square w-full justify-start"
                    @click.stop="emit('delete', rule.id)"
                >
                    <Icon icon="mingcute:back-line" size="18" class="shrink-0" />
                    {{ i18n.t('rules.delete') }}
                </button>
            </li>
        </ul>
    </li>
</template>
