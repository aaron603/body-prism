import { describe, expect, it } from 'vitest'
import { structures } from '@/content'
import { createSearchIndex } from '@/search'

const index = createSearchIndex(structures)
const ids = (q: string) => index.search(q).map((s) => s.id)

describe('search', () => {
  it('finds by Chinese name', () => {
    expect(ids('心')).toContain('heart')
    expect(ids('肱骨')[0]).toBe('humerus')
  })

  it('finds by English name', () => {
    expect(ids('femur')[0]).toBe('femur')
  })

  it('finds by Latin name', () => {
    expect(ids('Splen')).toContain('spleen')
  })

  it('finds by synonym', () => {
    expect(ids('collarbone')).toContain('clavicle')
  })

  it('finds by pinyin initials and full pinyin', () => {
    expect(ids('gg')).toContain('femur')
    expect(ids('gugu')).toContain('femur')
  })

  it('returns nothing for blank queries', () => {
    expect(ids('   ')).toEqual([])
  })
})
