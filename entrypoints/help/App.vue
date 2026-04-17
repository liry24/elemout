<script lang="ts" setup>
import CopyButton from '@/components/copyButton.vue'

const sections = [
    {
        titleKey: 'help.sections.basic.title',
        items: [
            { syntax: '#id', descriptionKey: 'help.sections.basic.items.id', example: '#header' },
            {
                syntax: '.class',
                descriptionKey: 'help.sections.basic.items.class',
                example: '.ad-banner',
            },
            {
                syntax: 'element',
                descriptionKey: 'help.sections.basic.items.element',
                example: 'div',
            },
            { syntax: '*', descriptionKey: 'help.sections.basic.items.all', example: undefined },
        ],
    },
    {
        titleKey: 'help.sections.attribute.title',
        items: [
            {
                syntax: '[attr]',
                descriptionKey: 'help.sections.attribute.items.present',
                example: '[data-ad]',
            },
            {
                syntax: '[attr="val"]',
                descriptionKey: 'help.sections.attribute.items.exact',
                example: '[type="banner"]',
            },
            {
                syntax: '[attr^="prefix"]',
                descriptionKey: 'help.sections.attribute.items.startsWith',
                example: '[id^="gpt-div-"]',
            },
            {
                syntax: '[attr$="suffix"]',
                descriptionKey: 'help.sections.attribute.items.endsWith',
                example: '[class$="-ad"]',
            },
            {
                syntax: '[attr*="str"]',
                descriptionKey: 'help.sections.attribute.items.contains',
                example: '[id*="advertisement"]',
            },
            {
                syntax: '[attr~="word"]',
                descriptionKey: 'help.sections.attribute.items.word',
                example: '[class~="sponsored"]',
            },
        ],
    },
    {
        titleKey: 'help.sections.combinator.title',
        items: [
            {
                syntax: 'A B',
                descriptionKey: 'help.sections.combinator.items.descendant',
                example: 'div span',
            },
            {
                syntax: 'A > B',
                descriptionKey: 'help.sections.combinator.items.child',
                example: 'ul > li',
            },
            {
                syntax: 'A + B',
                descriptionKey: 'help.sections.combinator.items.adjacent',
                example: 'h2 + p',
            },
            {
                syntax: 'A ~ B',
                descriptionKey: 'help.sections.combinator.items.siblings',
                example: 'h2 ~ p',
            },
            {
                syntax: 'A, B',
                descriptionKey: 'help.sections.combinator.items.group',
                example: '.ad, .banner',
            },
        ],
    },
    {
        titleKey: 'help.sections.pseudo.title',
        items: [
            {
                syntax: ':first-child',
                descriptionKey: 'help.sections.pseudo.items.firstChild',
                example: undefined,
            },
            {
                syntax: ':last-child',
                descriptionKey: 'help.sections.pseudo.items.lastChild',
                example: undefined,
            },
            {
                syntax: ':nth-child(n)',
                descriptionKey: 'help.sections.pseudo.items.nthChild',
                example: 'li:nth-child(2)',
            },
            {
                syntax: ':not(selector)',
                descriptionKey: 'help.sections.pseudo.items.not',
                example: 'div:not(.main)',
            },
            {
                syntax: ':empty',
                descriptionKey: 'help.sections.pseudo.items.empty',
                example: undefined,
            },
            {
                syntax: ':has(selector)',
                descriptionKey: 'help.sections.pseudo.items.has',
                example: 'div:has(> .ad)',
            },
        ],
    },
] as const

const practicalExamples = [
    {
        titleKey: 'help.examples.items.prefix.title' as const,
        descriptionKey: 'help.examples.items.prefix.description' as const,
        selector: '[id^="ad-"]',
    },
    {
        titleKey: 'help.examples.items.classContains.title' as const,
        descriptionKey: 'help.examples.items.classContains.description' as const,
        selector: '[class*="ad"]',
    },
    {
        titleKey: 'help.examples.items.dataAttribute.title' as const,
        descriptionKey: 'help.examples.items.dataAttribute.description' as const,
        selector: '[data-sponsored]',
    },
    {
        titleKey: 'help.examples.items.multiple.title' as const,
        descriptionKey: 'help.examples.items.multiple.description' as const,
        selector: '[id^="banner-"], [class$="-ad"], .promoted',
    },
] as const
</script>

<template>
    <div class="bg-base-100 text-base-content min-h-screen">
        <div class="mx-auto max-w-2xl space-y-8 px-4 py-8">
            <header>
                <h1 class="text-xl font-bold">{{ i18n.t('help.title') }}</h1>
                <p class="mt-1 text-sm text-zinc-400">
                    {{ i18n.t('help.description') }}
                </p>
            </header>

            <!-- reference sections -->
            <section v-for="section in sections" :key="section.titleKey">
                <h2 class="border-base-300 mb-3 border-b pb-1 text-sm font-semibold text-zinc-300">
                    {{ i18n.t(section.titleKey) }}
                </h2>
                <table class="w-full text-xs">
                    <thead>
                        <tr class="text-left text-zinc-500">
                            <th class="pr-4 pb-1.5 font-medium">
                                {{ i18n.t('help.table.syntax') }}
                            </th>
                            <th class="pr-4 pb-1.5 font-medium">
                                {{ i18n.t('help.table.description') }}
                            </th>
                            <th class="pb-1.5 font-medium">{{ i18n.t('help.table.example') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="item in section.items"
                            :key="item.syntax"
                            class="border-base-300 border-t"
                        >
                            <td class="text-accent py-2 pr-4 font-mono">{{ item.syntax }}</td>
                            <td class="py-2 pr-4 text-zinc-300">
                                {{ i18n.t(item.descriptionKey) }}
                            </td>
                            <td class="py-2">
                                <code v-if="item.example" class="font-mono text-zinc-400">
                                    {{ item.example }}
                                </code>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <!-- practical examples -->
            <section>
                <h2 class="border-base-300 mb-3 border-b pb-1 text-sm font-semibold text-zinc-300">
                    {{ i18n.t('help.examples.title') }}
                </h2>
                <ul class="space-y-3">
                    <li
                        v-for="ex in practicalExamples"
                        :key="ex.titleKey"
                        class="bg-base-200 rounded-lg p-3"
                    >
                        <p class="text-xs font-medium text-zinc-300">
                            {{ i18n.t(ex.titleKey) }}
                        </p>
                        <div class="mt-1.5 flex items-center gap-2">
                            <code
                                class="bg-base-300 text-accent flex-1 rounded px-2 py-1 font-mono text-xs"
                            >
                                {{ ex.selector }}
                            </code>
                            <CopyButton
                                :text="ex.selector"
                                :icon-size="14"
                                :label="i18n.t('help.copySelector')"
                                :copied-label="i18n.t('help.copiedSelector')"
                                class="btn-xs"
                            />
                        </div>
                        <p class="mt-1.5 text-xs text-zinc-500">
                            {{ i18n.t(ex.descriptionKey) }}
                        </p>
                    </li>
                </ul>
            </section>
        </div>
    </div>
</template>
