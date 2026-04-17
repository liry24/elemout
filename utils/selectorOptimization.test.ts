import { describe, expect, it } from 'vitest'

import { suggestOptimizedSelector } from './selectorOptimization'

describe('suggestOptimizedSelector', () => {
    it('proposes an id prefix selector for repeated ids', () => {
        expect(suggestOptimizedSelector(['#promo-banner-1', '#promo-banner-2'])).toBe(
            '[id^="promo-banner-"]',
        )
    })

    it('decodes escaped class names before computing prefixes', () => {
        expect(suggestOptimizedSelector(['.sm\\:card-1', '.sm\\:card-2'])).toBe(
            '[class*="sm:card-"]',
        )
    })

    it('trims weak trailing fragments at token boundaries', () => {
        expect(suggestOptimizedSelector(['.card-hero', '.card-hint'])).toBe('[class*="card-"]')
    })

    it('proposes attribute prefixes when attribute names match', () => {
        expect(
            suggestOptimizedSelector([
                '[data-testid="menu-item-1"]',
                '[data-testid="menu-item-2"]',
            ]),
        ).toBe('[data-testid^="menu-item-"]')
    })
})
