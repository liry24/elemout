<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import { formatForDisplay, useHotkeyRecorder } from '@tanstack/vue-hotkeys'

interface Props {
    modelValue: string
    placeholder?: string
}
const { modelValue, placeholder } = defineProps<Props>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { isRecording, startRecording, cancelRecording } = useHotkeyRecorder({
    onRecord: (hotkey) => emit('update:modelValue', hotkey),
})

const displayValue = computed(() => (modelValue ? formatForDisplay(modelValue) : ''))

const clearValue = (e: MouseEvent) => {
    e.stopPropagation()
    emit('update:modelValue', '')
}
</script>

<template>
    <div class="flex items-center gap-0.5">
        <button
            type="button"
            :class="
                cn(
                    'btn btn-sm btn-outline btn-primary min-w-20 px-2',
                    isRecording && 'border-error text-error',
                )
            "
            @click="startRecording"
            @blur="cancelRecording"
        >
            <span v-if="isRecording" class="animate-pulse">
                {{ placeholder ?? i18n.t('settings.keyInput.pressKey') }}
            </span>
            <span v-else-if="displayValue">{{ displayValue }}</span>
            <span v-else class="text-base-content/60">
                {{ placeholder ?? i18n.t('settings.keyInput.none') }}
            </span>
        </button>

        <button
            v-if="modelValue"
            type="button"
            :aria-label="i18n.t('settings.keyInput.clear')"
            class="btn btn-ghost btn-primary btn-square btn-sm"
            :title="i18n.t('settings.keyInput.clear')"
            @click="clearValue"
        >
            <Icon icon="mingcute:close-line" width="14" />
        </button>
    </div>
</template>
