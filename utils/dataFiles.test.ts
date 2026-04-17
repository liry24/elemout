import { describe, expect, it } from 'vitest'

import { createDataOperations, defineDataFile } from './dataFiles'

const dataOperations = createDataOperations({
    included: defineDataFile({
        filename: 'included.json',
        storage: {
            initial: 'initial-included',
            get: async () => 'included',
            set: async () => {},
        },
        merge: (_local: string, remote: string) => remote,
        stableSerialize: (value: string) => value,
    }),
    omitted: defineDataFile({
        filename: 'omitted.json',
        storage: {
            initial: 'initial-omitted',
            get: async () => 'omitted',
            set: async () => {},
        },
        merge: (_local: string, remote: string) => remote,
        omit: () => true,
        stableSerialize: (value: string) => value,
    }),
})

describe('dataFiles omission handling', () => {
    it('omits skipped files from serialization', () => {
        const files = dataOperations.serialize({
            included: 'local-value',
            omitted: 'remote-value',
        })

        expect(Object.keys(files)).toEqual(['included.json'])
        expect(JSON.parse(files['included.json'])).toMatchObject({
            version: 1,
            data: 'local-value',
        })
    })

    it('drops skipped files during deserialization', () => {
        expect(
            dataOperations.deserialize({
                'included.json': JSON.stringify({
                    version: 1,
                    exportedAt: 'now',
                    data: 'remote-value',
                }),
                'omitted.json': JSON.stringify({
                    version: 1,
                    exportedAt: 'now',
                    data: 'should-be-ignored',
                }),
            }),
        ).toEqual({
            included: 'remote-value',
            omitted: 'initial-omitted',
        })
    })

    it('treats omitted values as stable during stringify', () => {
        expect(
            dataOperations.stringify({
                included: 'same-value',
                omitted: 'one',
            }),
        ).toBe(
            dataOperations.stringify({
                included: 'same-value',
                omitted: 'two',
            }),
        )
    })

    it('throws on malformed required files in strict mode', () => {
        expect(() =>
            dataOperations.deserializeStrict({
                'included.json': '{"broken":true}',
            }),
        ).toThrow()
    })
})
