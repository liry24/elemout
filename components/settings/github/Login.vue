<script lang="ts" setup>
import { Icon } from '@iconify/vue'

import CopyButton from '@/components/copyButton.vue'

const { login, deviceFlow, loading, cancelLogin } = useGithubAuth()
</script>

<template>
    <div class="card card-body bg-base-300 grid gap-3">
        <div class="grid gap-2">
            <div>
                <p class="text-base-content text-sm">
                    {{ i18n.t('settings.github.loginWithGithub') }}
                </p>
                <p class="text-base-content/60 mt-0.5 text-xs">
                    {{ i18n.t('settings.github.loginWithGithubDesc') }}
                </p>
            </div>

            <button :disabled="loading" class="btn btn-soft btn-primary btn-sm" @click="login">
                <Icon icon="mingcute:github-fill" width="18" />
                {{ i18n.t('settings.github.login') }}
            </button>
        </div>

        <!-- デバイスログインフロー（インライン） -->
        <div v-if="deviceFlow" class="border-base-content/20 mt-3 space-y-3 border-t pt-3">
            <p class="text-base-content/60 text-xs leading-relaxed">
                {{ i18n.t('settings.deviceLogin.instruction') }}
            </p>

            <div class="bg-base-100 flex items-center gap-2 rounded-lg px-4 py-3">
                <span
                    class="text-base-content flex-1 text-center font-mono text-xl font-bold tracking-widest"
                >
                    {{ deviceFlow.userCode }}
                </span>

                <CopyButton
                    :text="deviceFlow.userCode"
                    :icon-size="16"
                    :label="i18n.t('settings.deviceLogin.copyCode')"
                    :copied-label="i18n.t('settings.deviceLogin.copied')"
                />
            </div>

            <div class="flex gap-2">
                <a
                    :href="deviceFlow.verificationUri"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-sm btn-neutral flex-1 gap-2"
                >
                    <Icon icon="mingcute:arrow-right-up-line" width="14" class="shrink-0" />
                    {{ i18n.t('settings.deviceLogin.openInGithub') }}
                </a>

                <button class="btn btn-sm btn-ghost" @click="cancelLogin">
                    {{ i18n.t('settings.deviceLogin.cancel') }}
                </button>
            </div>

            <div
                v-if="deviceFlow.polling"
                class="text-base-content/60 flex items-center gap-2 text-xs"
            >
                <Icon icon="svg-spinners:ring-resize" width="14" class="shrink-0" />
                {{ i18n.t('settings.deviceLogin.waitingForApproval') }}
            </div>
        </div>
    </div>
</template>
