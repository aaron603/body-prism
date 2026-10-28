import type { EntryMeta, ViewState } from './types'

/** Opacity applied to unselected structures while a selection is active and dimming is on. */
export const DIM_FACTOR = 0.15

/** Whether a structure should be drawn (and therefore be pickable). */
export function isEntryVisible(meta: EntryMeta, state: ViewState): boolean {
  if (state.isolatedId !== null) return meta.id === state.isolatedId
  if (!state.visibleSystems.has(meta.system)) return false
  if (state.hiddenIds.has(meta.id)) return false
  if (meta.sex !== undefined && meta.sex !== state.sex) return false
  return true
}

/** Final material opacity in [0, 1] for a visible structure. */
export function entryOpacity(meta: EntryMeta, state: ViewState): number {
  const base = state.systemOpacity[meta.system] ?? 1
  const dimmed =
    state.dimOthers && state.selectedId !== null && state.selectedId !== meta.id
  return dimmed ? base * DIM_FACTOR : base
}
