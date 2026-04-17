/**
 * WXT ストレージアイテムを Vue Ref にバインドするコンポーザブル。
 * - コンポーネントマウント時にストレージから初期値を読み込む
 * - ref の変更をストレージに書き戻す
 * - Gist sync 等の外部変更も ref にリアクティブに反映する
 */
import { watchIgnorable } from '@vueuse/core'

interface WatchableStorageItem<T> {
    fallback: T
    getValue(): Promise<T>
    setValue(val: T): Promise<void>
    watch(cb: (newValue: T, oldValue: T) => void): () => void
}

export const useStorageItem = <T>(item: WatchableStorageItem<T>): Ref<T> => {
    const val = ref<T>(item.fallback) as Ref<T>

    // ref が変更されたとき（ユーザー操作）ストレージに書き戻す
    // ignoreUpdates で囲まれた変更はこの watch をスキップする（循環書き込み防止）
    const { ignoreUpdates } = watchIgnorable(
        val,
        (newVal) => {
            void item.setValue(newVal)
        },
        { flush: 'sync' },
    )

    onMounted(async () => {
        const value = await item.getValue()
        ignoreUpdates(() => {
            val.value = value
        })
    })

    // Gist sync などの外部変更を ref に反映する
    const unwatch = item.watch((newVal) => {
        ignoreUpdates(() => {
            val.value = newVal
        })
    })

    onUnmounted(() => unwatch())

    return val
}
