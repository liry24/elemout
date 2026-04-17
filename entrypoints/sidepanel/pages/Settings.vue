<script lang="ts" setup>
import { Icon } from '@iconify/vue'

import appConfig from '@/app.config'
import BehaviorSection from '@/components/settings/Behavior.vue'
import DataSection from '@/components/settings/Data.vue'
import DeveloperSection from '@/components/settings/Developer.vue'
import GithubSection from '@/components/settings/Github.vue'

const router = useRouter()
</script>

<template>
    <div class="flex h-screen flex-col gap-2 p-3 pb-2">
        <header class="border-base-content/10 flex items-center gap-1 border-b pb-2">
            <button
                :aria-label="i18n.t('rules.back')"
                class="btn btn-ghost btn-square btn-sm"
                :title="i18n.t('rules.back')"
                @click="router.back()"
            >
                <Icon icon="mingcute:arrow-left-line" width="18" />
            </button>
            <h1 class="text-sm font-semibold text-zinc-200">{{ i18n.t('settings.title') }}</h1>
        </header>

        <div class="flex-1 space-y-4 overflow-y-auto">
            <GithubSection />
            <DataSection />
            <BehaviorSection />
            <DeveloperSection />

            <div class="p-2">
                <span class="text-base-content/60 text-xs">
                    {{ i18n.t('settings.version', [appConfig.version]) }}
                </span>
            </div>
        </div>

        <footer class="flex items-center">
            <a
                :href="appConfig.donate"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-sm btn-ghost btn-error gap-2"
            >
                <Icon icon="simple-icons:githubsponsors" width="18" />
                {{ i18n.t('settings.donate') }}
            </a>
            <a
                :href="appConfig.repo"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="i18n.t('settings.openRepository')"
                class="btn btn-ghost btn-square btn-sm ml-auto gap-2"
                :title="i18n.t('settings.openRepository')"
            >
                <Icon icon="simple-icons:github" width="18" />
            </a>
        </footer>
    </div>
</template>
