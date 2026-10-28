import { describe, expect, it } from 'vitest'
import { findReferenceProblems, structureById, structures } from '@/content'
import { SYSTEM_IDS } from '@/content/schema'

describe('content data', () => {
  it('loads structures that pass the schema', () => {
    expect(structures.length).toBeGreaterThan(50)
  })

  it('has unique ids and no dangling references', () => {
    expect(findReferenceProblems(structures)).toEqual([])
  })

  it('covers all 11 systems', () => {
    const covered = new Set(structures.map((s) => s.system))
    for (const id of SYSTEM_IDS) {
      expect(covered.has(id), `system ${id} should have structures`).toBe(true)
    }
  })

  it('looks up structures by id', () => {
    expect(structureById.get('heart')?.names.la).toBe('Cor')
  })

  it('detects a dangling reference', () => {
    const broken = [{ ...structures[0], relations: { origin: ['no_such_id'] } }]
    expect(findReferenceProblems(broken)).toContain(
      `${structures[0].id} references unknown id: no_such_id`,
    )
  })
})
