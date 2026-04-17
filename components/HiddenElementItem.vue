<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import { useClipboard } from '@vueuse/core'

interface Props {
    element: HiddenElement
    currentHost?: string
    selected?: boolean
    isSelectionMode?: boolean
}
const { element, currentHost, selected = false, isSelectionMode = false } = defineProps<Props>()

interface Emits {
    restore: []
    preview: []
    'end-preview': []
    convert: [element: HiddenElement, host: string]
    select: []
}
const emit = defineEmits<Emits>()

const { copy } = useClipboard()

const handleClick = (e: MouseEvent) => {
    if (isSelectionMode || e.shiftKey) {
        e.preventDefault()
        emit('select')
    }
}
</script>

<template>
    <li
        :class="
            cn(
                'group hover:bg-base-content/10 relative flex h-10 items-center gap-2 p-1 pl-2 transition-colors',
                selected && 'bg-primary/15',
            )
        "
        @mouseenter="emit('preview')"
        @mouseleave="emit('end-preview')"
        @click="handleClick"
    >
        <input
            type="checkbox"
            :checked="selected"
            :aria-label="i18n.t('element.select', [element.selector])"
            :class="
                cn(
                    'checkbox checkbox-xs transition-opacity',
                    isSelectionMode || selected ? '' : 'opacity-0 group-hover:opacity-100',
                )
            "
            @click.stop="emit('select')"
        />

        <p
            :title="element.selector"
            class="text-base-content min-w-0 flex-1 truncate font-mono text-xs"
        >
            {{ element.selector }}
        </p>

        <button
            v-show="!isSelectionMode"
            :aria-label="i18n.t('element.moreActions', [element.selector])"
            :popovertarget="`popover-${element.id}`"
            :style="`anchor-name: --anchor-${element.id}`"
            class="btn btn-ghost btn-square btn-sm opacity-0 transition-opacity group-hover:opacity-100"
            :title="i18n.t('element.moreActions', [element.selector])"
            @click.stop
        >
            <Icon icon="mingcute:more-2-line" size="18" class="size-4.5 shrink-0" />
        </button>
        <ul
            v-show="!isSelectionMode"
            class="dropdown menu rounded-box bg-base-300 w-52 shadow-sm"
            popover
            :id="`popover-${element.id}`"
            :style="`position-anchor: --anchor-${element.id}`"
        >
            <li>
                <button
                    :aria-label="i18n.t('element.copySelector')"
                    :title="i18n.t('element.copySelector')"
                    class="btn btn-ghost btn-square w-full justify-start"
                    @click.stop="copy(element.selector)"
                >
                    <Icon icon="mingcute:copy-2-fill" size="18" class="shrink-0" />
                    {{ i18n.t('element.copySelector') }}
                </button>
            </li>
            <li>
                <button
                    :aria-label="i18n.t('rules.convertToRule')"
                    :title="i18n.t('rules.convertToRule')"
                    class="btn btn-ghost btn-square w-full justify-start"
                    @click.stop="emit('convert', element, currentHost ?? '')"
                >
                    <Icon icon="mingcute:list-check-fill" size="18" class="shrink-0" />
                    {{ i18n.t('rules.convertToRule') }}
                </button>
            </li>
            <li>
                <button
                    :aria-label="i18n.t('element.restore')"
                    :title="i18n.t('element.restore')"
                    class="btn btn-ghost btn-square w-full justify-start"
                    @click.stop="emit('restore')"
                >
                    <Icon icon="mingcute:back-line" size="18" class="shrink-0" />
                    {{ i18n.t('element.restore') }}
                </button>
            </li>
        </ul>
    </li>
</template>
