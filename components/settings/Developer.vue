<script lang="ts" setup>
const showSelectorPreviewVal = useStorageItem(showSelectorPreview)
</script>

<template>
    <section class="space-y-2">
        <h2 class="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
            {{ i18n.t('settings.developer') }}
        </h2>

        <div class="bg-base-300 card card-body grid gap-8">
            <div class="flex items-center justify-between gap-4">
                <div>
                    <p class="text-base-content text-sm">
                        {{ i18n.t('settings.showSelectorPreview') }}
                    </p>
                    <p class="text-base-content/60 mt-0.5 text-xs">
                        {{ i18n.t('settings.showSelectorPreviewDesc') }}
                    </p>
                </div>

                <input
                    type="checkbox"
                    v-model="showSelectorPreviewVal"
                    :aria-label="i18n.t('settings.showSelectorPreview')"
                    class="toggle toggle-sm toggle-primary"
                />
            </div>
        </div>
    </section>
</template>
