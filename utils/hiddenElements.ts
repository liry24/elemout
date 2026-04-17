export const removeHiddenElementsFromData = (
    data: StorageData,
    host: string,
    ids: readonly string[],
) => {
    const idsSet = new Set(ids)
    return {
        ...data,
        [host]: (data[host] ?? []).filter((element) => !idsSet.has(element.id)),
    }
}
