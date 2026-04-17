<script lang="ts" setup>
import AppKeyInput from '@/components/AppKeyInput.vue'

const wheelInvertedVal = useStorageItem(wheelInverted)
const wheelDeadzoneVal = useStorageItem(wheelDeadzone)
const includeSettingsInSyncVal = useStorageItem(includeSettingsInSync)
const scrollModeKeyVal = useStorageItem(scrollModeKey)
const selectionStartKeyVal = useStorageItem(selectionStartKey)

const onWheelDeadzoneChange = (e: Event) => {
    const num = Number((e.target as HTMLInputElement).value)
    if (!Number.isFinite(num)) return
    wheelDeadzoneVal.value = Math.max(0, num)
}
</script>

<template>
    <section class="space-y-2">
        <h2 class="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
            {{ i18n.t('settings.behavior') }}
        </h2>

        <div class="bg-base-300 card card-body grid gap-8">
            <div class="flex items-center justify-between gap-4">
                <div>
                    <p class="text-base-content text-sm">
                        {{ i18n.t('settings.wheelInvert') }}
                    </p>
                    <p class="text-base-content/60 mt-0.5 text-xs">
                        {{ i18n.t('settings.wheelInvertDesc') }}
                    </p>
                </div>
                <input
                    type="checkbox"
                    v-model="wheelInvertedVal"
                    :aria-label="i18n.t('settings.wheelInvert')"
                    class="toggle toggle-sm toggle-primary"
                />
            </div>

            <div class="flex items-center justify-between gap-4">
                <div>
                    <p class="text-base-content text-sm">{{ i18n.t('settings.wheelDeadzone') }}</p>
                    <p class="text-base-content/60 mt-0.5 text-xs">
                        {{ i18n.t('settings.wheelDeadzoneDesc') }}
                    </p>
                </div>

                <input
                    type="number"
                    :aria-label="i18n.t('settings.wheelDeadzone')"
                    placeholder="0"
                    min="0"
                    :value="wheelDeadzoneVal"
                    class="input input-sm input-primary w-12 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    @change="onWheelDeadzoneChange"
                />
            </div>

            <div class="grid gap-2">
                <div>
                    <p class="text-base-content text-sm">
                        {{ i18n.t('settings.selectionStartKey') }}
                    </p>
                    <p class="text-base-content/60 mt-0.5 text-xs">
                        {{ i18n.t('settings.selectionStartKeyDesc') }}
                    </p>
                </div>
                <AppKeyInput v-model="selectionStartKeyVal" class="ml-auto" />
            </div>

            <div class="grid gap-2">
                <div>
                    <p class="text-base-content text-sm">{{ i18n.t('settings.scrollModeKey') }}</p>
                    <p class="text-base-content/60 mt-0.5 text-xs">
                        {{ i18n.t('settings.scrollModeKeyDesc') }}
                    </p>
                </div>
                <AppKeyInput v-model="scrollModeKeyVal" class="ml-auto" />
            </div>

            <div class="flex items-center justify-between gap-4">
                <div>
                    <p class="text-base-content text-sm">
                        {{ i18n.t('settings.includeSettingsInSync') }}
                    </p>
                    <p class="text-base-content/60 mt-0.5 text-xs">
                        {{ i18n.t('settings.includeSettingsInSyncDesc') }}
                    </p>
                </div>
                <input
                    type="checkbox"
                    v-model="includeSettingsInSyncVal"
                    :aria-label="i18n.t('settings.includeSettingsInSync')"
                    class="toggle toggle-sm toggle-primary"
                />
            </div>
        </div>
    </section>
</template>
