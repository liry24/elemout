export interface StorageItemLike<T> {
    fallback: T
    getValue(): Promise<T>
    setValue(value: T): Promise<void>
}

export interface StorageBinding<T> {
    initial: T
    get(): Promise<T>
    set(value: T): Promise<void>
}

export interface StorageBindingOptions<T> {
    sanitize?: (value: T) => T
}

type StorageFieldMap = Record<string, StorageItemLike<unknown>>

export type StorageFieldValue<TFields extends StorageFieldMap> = {
    [K in keyof TFields]: Awaited<ReturnType<TFields[K]['getValue']>>
}

const identity = <T>(value: T): T => value

export const storageItem = <T>(
    item: StorageItemLike<T>,
    options?: StorageBindingOptions<T>,
): StorageBinding<T> => {
    const normalize = options?.sanitize ?? identity<T>
    return {
        initial: normalize(item.fallback),
        get: async () => normalize(await item.getValue()),
        set: async (value) => item.setValue(normalize(value)),
    }
}

export const storageFields = <TFields extends StorageFieldMap>(
    fields: TFields,
    options?: StorageBindingOptions<StorageFieldValue<TFields>>,
): StorageBinding<StorageFieldValue<TFields>> => {
    const normalize = options?.sanitize ?? identity<StorageFieldValue<TFields>>
    const entries = Object.entries(fields)
    return {
        initial: normalize(
            Object.fromEntries(
                entries.map(([key, item]) => [key, item.fallback]),
            ) as StorageFieldValue<TFields>,
        ),
        get: async () => {
            const values = await Promise.all(
                entries.map(async ([key, item]) => [key, await item.getValue()]),
            )
            return normalize(Object.fromEntries(values) as StorageFieldValue<TFields>)
        },
        set: async (value) => {
            const normalized = normalize(value)
            await Promise.all(
                entries.map(([key, item]) => item.setValue(normalized[key as keyof TFields])),
            )
        },
    }
}

export interface DataFileContent<T> {
    version: 1
    exportedAt: string
    data: T
}

export const wrapDataFileContent = <T>(data: T): string =>
    JSON.stringify(
        { version: 1, exportedAt: new Date().toISOString(), data } satisfies DataFileContent<T>,
        null,
        2,
    )

export const unwrapDataFileContent = <T>(json: string): DataFileContent<T> => {
    let parsed: unknown
    try {
        parsed = JSON.parse(json)
    } catch {
        throw new Error('Data file JSON parse failed')
    }

    if (
        typeof parsed !== 'object' ||
        parsed === null ||
        (parsed as Record<string, unknown>).version !== 1
    ) {
        throw new Error('Data file format is invalid')
    }

    return parsed as DataFileContent<T>
}

export interface DataFileInput<TValue, TStorage = TValue> {
    filename: string
    storage: StorageBinding<TStorage>
    initial?: TValue
    read?: (value: TStorage) => TValue
    write?: (value: TValue) => TStorage | undefined
    sanitize?: (value: TValue) => TValue
    merge: (local: TValue, remote: TValue) => TValue
    omit?: (value: TValue) => boolean
    stableSerialize?: (value: NonNullable<TValue>) => string
}

export interface DataFileDef<TValue, TStorage = TValue> {
    filename: string
    storage: StorageBinding<TStorage>
    initial: TValue
    read: (value: TStorage) => TValue
    write: (value: TValue) => TStorage | undefined
    sanitize: (value: TValue) => TValue
    merge: (local: TValue, remote: TValue) => TValue
    omit?: (value: TValue) => boolean
    stableSerialize?: (value: NonNullable<TValue>) => string
}

export const defineDataFile = <TValue, TStorage = TValue>(
    file: DataFileInput<TValue, TStorage>,
): DataFileDef<TValue, TStorage> => {
    const read = file.read ?? ((value: TStorage) => value as unknown as TValue)
    const write =
        file.write ??
        ((value: TValue) => (value === undefined ? undefined : (value as unknown as TStorage)))
    const sanitize = file.sanitize ?? identity<TValue>
    const initial = Object.prototype.hasOwnProperty.call(file, 'initial')
        ? sanitize(file.initial as TValue)
        : sanitize(read(file.storage.initial))

    return {
        filename: file.filename,
        storage: file.storage,
        initial,
        read,
        write,
        sanitize,
        merge: file.merge,
        omit: file.omit,
        stableSerialize: file.stableSerialize,
    }
}

// oxlint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDataFiles = Record<string, DataFileDef<any, any>>

export type DataFileValues<TFiles extends AnyDataFiles> = {
    [K in keyof TFiles]: TFiles[K] extends DataFileDef<infer TValue, infer _TStorage>
        ? TValue
        : never
}

export interface DataOperations<TFiles extends AnyDataFiles> {
    getData: () => Promise<DataFileValues<TFiles>>
    setData: (data: DataFileValues<TFiles>) => Promise<void>
    merge: (local: DataFileValues<TFiles>, remote: DataFileValues<TFiles>) => DataFileValues<TFiles>
    stringify: (data: DataFileValues<TFiles>) => string
    serialize: (data: DataFileValues<TFiles>) => Record<string, string>
    deserialize: (files: Record<string, string>) => DataFileValues<TFiles>
    deserializeStrict: (files: Record<string, string>) => DataFileValues<TFiles>
    initialBase: DataFileValues<TFiles>
    expectedFiles: string[]
    optionalFiles: string[]
    gistFilterFileNames: string[]
    gistDescription?: string
}

const isOmittedValue = <T>(file: { omit?: (value: T) => boolean }, value: T): boolean =>
    file.omit?.(value) ?? false

const deserializeDataFile = <TValue, TStorage>(
    file: DataFileDef<TValue, TStorage>,
    raw: string | undefined,
    strict: boolean,
): TValue => {
    if (raw === undefined) return file.initial

    try {
        const value = file.sanitize(unwrapDataFileContent<TValue>(raw).data)
        return isOmittedValue(file, value) ? file.initial : value
    } catch (error) {
        if (strict) throw error
        return file.initial
    }
}

export const createDataOperations = <TFiles extends AnyDataFiles>(
    files: TFiles,
    options?: { gistDescription?: string },
): DataOperations<TFiles> => {
    const fileEntries = Object.entries(files) as Array<[string, AnyDataFiles[string]]>

    const getData = async (): Promise<DataFileValues<TFiles>> => {
        const values = await Promise.all(
            fileEntries.map(async ([key, file]) => {
                const value = file.sanitize(file.read(await file.storage.get()))
                return [key, isOmittedValue(file, value) ? file.initial : value]
            }),
        )
        return Object.fromEntries(values) as DataFileValues<TFiles>
    }

    const setData = async (data: DataFileValues<TFiles>): Promise<void> => {
        await Promise.all(
            fileEntries.map(([key, file]) => {
                const value = file.sanitize(data[key as keyof TFiles] as never)
                if (isOmittedValue(file, value)) return Promise.resolve()
                const storedValue = file.write(value)
                if (storedValue === undefined) return Promise.resolve()
                return file.storage.set(storedValue)
            }),
        )
    }

    const merge = (
        local: DataFileValues<TFiles>,
        remote: DataFileValues<TFiles>,
    ): DataFileValues<TFiles> => {
        const values = fileEntries.map(([key, file]) => {
            const merged = file.merge(
                file.sanitize(local[key as keyof TFiles] as never),
                file.sanitize(remote[key as keyof TFiles] as never),
            )
            return [key, file.sanitize(merged)]
        })
        return Object.fromEntries(values) as DataFileValues<TFiles>
    }

    const stringify = (data: DataFileValues<TFiles>): string => {
        const parts = fileEntries.map(([key, file]) => {
            const value = file.sanitize(data[key as keyof TFiles] as never)
            if (value === undefined || isOmittedValue(file, value)) return 'omitted'
            const stableSerialize = file.stableSerialize ?? JSON.stringify
            return stableSerialize(value)
        })
        return JSON.stringify(parts)
    }

    const serialize = (data: DataFileValues<TFiles>): Record<string, string> => {
        const serialized: Record<string, string> = {}
        for (const [key, file] of fileEntries) {
            const value = file.sanitize(data[key as keyof TFiles] as never)
            if (value === undefined || isOmittedValue(file, value)) continue
            serialized[file.filename] = wrapDataFileContent(value)
        }
        return serialized
    }

    const deserialize = (dataFiles: Record<string, string>): DataFileValues<TFiles> => {
        const values = fileEntries.map(([key, file]) => [
            key,
            deserializeDataFile(file, dataFiles[file.filename], false),
        ])
        return Object.fromEntries(values) as DataFileValues<TFiles>
    }

    const deserializeStrict = (dataFiles: Record<string, string>): DataFileValues<TFiles> => {
        const values = fileEntries.map(([key, file]) => [
            key,
            deserializeDataFile(file, dataFiles[file.filename], true),
        ])
        return Object.fromEntries(values) as DataFileValues<TFiles>
    }

    const initialBase = Object.fromEntries(
        fileEntries.map(([key, file]) => [key, file.initial]),
    ) as DataFileValues<TFiles>
    const expectedFiles = fileEntries.map(([, file]) => file.filename)
    const optionalFiles = fileEntries
        .filter(([, file]) => typeof file.omit === 'function')
        .map(([, file]) => file.filename)

    return {
        getData,
        setData,
        merge,
        stringify,
        serialize,
        deserialize,
        deserializeStrict,
        initialBase,
        expectedFiles,
        optionalFiles,
        gistFilterFileNames: [...expectedFiles],
        gistDescription: options?.gistDescription,
    }
}
