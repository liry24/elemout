<script lang="ts" setup>
import {
    formatForDisplay,
    matchesKeyboardEvent,
    parseHotkey,
    useHotkey,
} from '@tanstack/vue-hotkeys'
import { useEventListener } from '@vueuse/core'
import getCssSelector from 'css-selector-generator'

const props = defineProps<{
    isWheelInverted: boolean
    deadzonePx: number
    showSelectorPreview: boolean
    scrollModeKey: string
}>()
const emit = defineEmits<{ hide: [el: Element]; stop: [] }>()

const indicatorRef = ref<HTMLDivElement | null>(null)
const isScrollMode = ref(false)
const highlightVisible = ref(false)
const highlightRect = reactive({ top: 0, left: 0, width: 0, height: 0 })
const indicatorOpacity = ref(1)
const hoveredSelector = ref('')

let hoveredEl: Element | null = null
let hoveredElStack: Element[] = []
let wheelDeadZoneActive = false
let wheelDeadZoneX = 0
let wheelDeadZoneY = 0

const updateHighlight = (el: Element) => {
    const { top, left, width, height } = el.getBoundingClientRect()
    Object.assign(highlightRect, { top, left, width, height })
    highlightVisible.value = true
    hoveredSelector.value = props.showSelectorPreview
        ? getCssSelector(el, { ignoreGeneratedClassNames: true })
        : ''
}

const resetHover = () => {
    hoveredEl = null
    hoveredElStack = []
    hoveredSelector.value = ''
}

const onMouseMove = (e: MouseEvent) => {
    if (wheelDeadZoneActive) {
        const dx = e.clientX - wheelDeadZoneX
        const dy = e.clientY - wheelDeadZoneY
        if (dx * dx + dy * dy < props.deadzonePx * props.deadzonePx) return
        wheelDeadZoneActive = false
    }

    if (indicatorRef.value) {
        const r = indicatorRef.value.getBoundingClientRect()
        indicatorOpacity.value =
            e.clientX >= r.left &&
            e.clientX <= r.right &&
            e.clientY >= r.top &&
            e.clientY <= r.bottom
                ? 0.15
                : 1
    }

    // shadow host が pointer-events:none のため、document capture listener では
    // e.target が実際のページ要素（広告等）を直接示す
    const el = e.target instanceof Element ? e.target : null
    if (!el || el === hoveredEl) return
    hoveredEl = el
    hoveredElStack = []
    updateHighlight(el)
}

const onMouseLeave = () => {
    resetHover()
    wheelDeadZoneActive = false
    highlightVisible.value = false
    indicatorOpacity.value = 1
}

const onWheel = (e: WheelEvent) => {
    if (!hoveredEl || isScrollMode.value) return
    e.preventDefault()
    e.stopPropagation()

    wheelDeadZoneActive = true
    wheelDeadZoneX = e.clientX
    wheelDeadZoneY = e.clientY

    const goToParent = props.isWheelInverted ? e.deltaY < 0 : e.deltaY > 0
    if (goToParent) {
        const parent = hoveredEl.parentElement
        if (!parent || parent === document.documentElement) return
        hoveredElStack.push(hoveredEl)
        hoveredEl = parent
    } else {
        const prev = hoveredElStack.pop()
        if (!prev) return
        hoveredEl = prev
    }
    updateHighlight(hoveredEl)
}

const onClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!hoveredEl) return
    const target = hoveredEl
    resetHover()
    highlightVisible.value = false
    emit('hide', target)
}

const scrollKeyDisplay = computed(() =>
    props.scrollModeKey ? formatForDisplay(props.scrollModeKey) : null,
)

const onKeyDown = (e: KeyboardEvent) => {
    if (props.scrollModeKey && matchesKeyboardEvent(e, parseHotkey(props.scrollModeKey))) {
        e.preventDefault()
        isScrollMode.value = !isScrollMode.value
    }
}

useHotkey('Escape', () => emit('stop'))

// shadow host が pointer-events:none のため overlay div はイベントを受け取れない。
// document のキャプチャフェーズで処理することで、z-index 最前面の広告要素を含む
// すべてのページ要素を選択可能にする。
useEventListener(document, 'mousemove', onMouseMove, { capture: true })
useEventListener(document, 'click', onClick, { capture: true })
useEventListener(document, 'wheel', onWheel, { capture: true, passive: false })
useEventListener(document.documentElement, 'mouseleave', onMouseLeave)
useEventListener(document, 'keydown', onKeyDown, { capture: true })

const toggleScrollMode = () => {
    isScrollMode.value = !isScrollMode.value
}
defineExpose({ toggleScrollMode })
</script>

<template>
    <div
        ref="overlayRef"
        style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 2147483647;
            pointer-events: none;
            outline: none;
        "
        tabindex="-1"
    >
        <!-- ハイライト矩形 -->
        <div
            v-if="highlightVisible"
            :style="{
                position: 'fixed',
                top: highlightRect.top + 'px',
                left: highlightRect.left + 'px',
                width: highlightRect.width + 'px',
                height: highlightRect.height + 'px',
                pointerEvents: 'none',
                backgroundColor: 'color-mix(in srgb, #f43f5e 30%, transparent)',
                outline: '2px solid color-mix(in srgb, #f43f5e 80%, transparent)',
                outlineOffset: '2px',
                borderRadius: '2px',
            }"
        />

        <!-- セレクタプレビュー -->
        <div
            v-if="highlightVisible && showSelectorPreview && hoveredSelector"
            :style="{
                position: 'fixed',
                top: highlightRect.top + highlightRect.height + 4 + 'px',
                left: highlightRect.left + 'px',
                maxWidth: '80vw',
                pointerEvents: 'none',
                background: 'rgba(15, 15, 15, 0.85)',
                color: '#94a3b8',
                fontSize: '11px',
                fontFamily: 'monospace, monospace',
                padding: '2px 6px',
                borderRadius: '3px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            }"
        >
            {{ hoveredSelector }}
        </div>

        <!-- 操作説明パネル -->
        <div
            ref="indicatorRef"
            style="
                position: absolute;
                top: 12px;
                right: 12px;
                background: rgba(15, 15, 15, 0.85);
                color: #e2e8f0;
                border-radius: 12px;
                padding: 16px 20px;
                font:
                    12px/1.6 system-ui,
                    sans-serif;
                white-space: nowrap;
                user-select: none;
                pointer-events: none;
                transition: opacity 0.15s;
            "
            :style="{ opacity: indicatorOpacity }"
        >
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px; color: #f43f5e">
                {{ i18n.t('selectionMode.title') }}
            </div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 10px">
                <span style="color: #64748b">{{ i18n.t('selectionMode.click') }}</span>
                <span>{{ i18n.t('selectionMode.hideElement') }}</span>
                <span style="color: #64748b">{{ i18n.t('selectionMode.wheelDown') }}</span>
                <span>{{ i18n.t('selectionMode.parentElement') }}</span>
                <span style="color: #64748b">{{ i18n.t('selectionMode.wheelUp') }}</span>
                <span>{{ i18n.t('selectionMode.childElement') }}</span>
            </div>
            <div
                v-if="scrollKeyDisplay"
                :style="{
                    marginTop: '6px',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingTop: '6px',
                    color: isScrollMode ? '#4ade80' : '#94a3b8',
                }"
            >
                {{
                    isScrollMode
                        ? i18n.t('selectionMode.scrollActive', [scrollKeyDisplay])
                        : i18n.t('selectionMode.scrollToggle', [scrollKeyDisplay])
                }}
            </div>
            <div style="margin-top: 2px; color: #64748b">
                {{ i18n.t('selectionMode.exit') }}
            </div>
        </div>
    </div>
</template>
