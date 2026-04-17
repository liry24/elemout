<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import { useClipboard } from '@vueuse/core'

interface Props {
    text: string
    iconSize?: number | string
    label: string
    copiedLabel?: string
}
const { text, iconSize = 16, label, copiedLabel } = defineProps<Props>()

const { copy, copied } = useClipboard()
const accessibleLabel = computed(() => (copied.value ? (copiedLabel ?? label) : label))
</script>

<template>
    <button
        :aria-label="accessibleLabel"
        :title="accessibleLabel"
        class="btn btn-ghost btn-square"
        @click="copy(text)"
    >
        <Icon :icon="copied ? 'mingcute:check-line' : 'mingcute:copy-2-line'" :width="iconSize" />
    </button>
</template>
