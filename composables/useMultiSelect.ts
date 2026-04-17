export const useMultiSelect = () => {
    const selectedIds = ref<Set<string>>(new Set())
    const hasSelection = computed(() => selectedIds.value.size > 0)

    const toggle = (id: string) => {
        const next = new Set(selectedIds.value)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        selectedIds.value = next
    }

    const clear = () => {
        selectedIds.value = new Set()
    }

    return { selectedIds, hasSelection, toggle, clear }
}
