import type { SystemId } from '@/content/schema'

export type Sex = 'male' | 'female'
export type ClipAxis = 'sagittal' | 'coronal' | 'transverse'
export type ViewPreset = 'front' | 'back' | 'left' | 'right' | 'top'

export interface ClipState {
  enabled: boolean
  axis: ClipAxis
  /** Plane position in metres along the axis (x, z or y). */
  position: number
}

/** Everything the viewer needs to render; the Pinia store is the source of truth. */
export interface ViewState {
  visibleSystems: ReadonlySet<SystemId>
  systemOpacity: Partial<Record<SystemId, number>>
  hiddenIds: ReadonlySet<string>
  isolatedId: string | null
  selectedId: string | null
  /** Fade everything except the selected structure. */
  dimOthers: boolean
  sex: Sex
  clip: ClipState
}

export interface EntryMeta {
  id: string
  system: SystemId
  sex?: Sex
}

export function defaultViewState(): ViewState {
  return {
    visibleSystems: new Set<SystemId>(),
    systemOpacity: {},
    hiddenIds: new Set<string>(),
    isolatedId: null,
    selectedId: null,
    dimOthers: true,
    sex: 'male',
    clip: { enabled: false, axis: 'transverse', position: 1.2 },
  }
}
