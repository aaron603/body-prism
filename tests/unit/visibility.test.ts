import { describe, expect, it } from 'vitest'
import { defaultViewState, type ViewState } from '@/viewer/types'
import { DIM_FACTOR, entryOpacity, isEntryVisible } from '@/viewer/visibility'
import type { SystemId } from '@/content/schema'

function stateWith(partial: Partial<ViewState>): ViewState {
  return { ...defaultViewState(), ...partial }
}

const bone = { id: 'femur', system: 'skeletal' as SystemId }
const uterus = { id: 'uterus', system: 'reproductive' as SystemId, sex: 'female' as const }

describe('isEntryVisible', () => {
  it('hides structures whose system is off', () => {
    expect(isEntryVisible(bone, stateWith({}))).toBe(false)
    expect(isEntryVisible(bone, stateWith({ visibleSystems: new Set<SystemId>(['skeletal']) }))).toBe(true)
  })

  it('hides individually hidden ids', () => {
    const state = stateWith({ visibleSystems: new Set<SystemId>(['skeletal']), hiddenIds: new Set(['femur']) })
    expect(isEntryVisible(bone, state)).toBe(false)
  })

  it('filters sex-specific structures', () => {
    const systems = new Set<SystemId>(['reproductive'])
    expect(isEntryVisible(uterus, stateWith({ visibleSystems: systems, sex: 'female' }))).toBe(true)
    expect(isEntryVisible(uterus, stateWith({ visibleSystems: systems, sex: 'male' }))).toBe(false)
  })

  it('isolation shows only the isolated id, even when its system is off', () => {
    const state = stateWith({ isolatedId: 'femur' })
    expect(isEntryVisible(bone, state)).toBe(true)
    expect(isEntryVisible({ id: 'tibia', system: 'skeletal' }, state)).toBe(false)
  })
})

describe('entryOpacity', () => {
  it('uses the system opacity, defaulting to 1', () => {
    expect(entryOpacity(bone, stateWith({}))).toBe(1)
    expect(entryOpacity(bone, stateWith({ systemOpacity: { skeletal: 0.4 } }))).toBe(0.4)
  })

  it('dims everything except the selection when dimming is on', () => {
    const state = stateWith({ selectedId: 'tibia', dimOthers: true })
    expect(entryOpacity(bone, state)).toBeCloseTo(DIM_FACTOR)
    expect(entryOpacity({ id: 'tibia', system: 'skeletal' }, state)).toBe(1)
    expect(entryOpacity(bone, { ...state, dimOthers: false })).toBe(1)
  })
})
