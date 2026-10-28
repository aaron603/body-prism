import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { structureById } from '@/content'
import { SYSTEM_IDS, type SystemId } from '@/content/schema'
import type { ClipAxis, ClipState, Sex, ViewState } from '@/viewer/types'

export type PanelName = 'none' | 'layers' | 'clip' | 'view' | 'info'

/** Systems shown when the app first opens; muscle and skin would hide everything else. */
const DEFAULT_VISIBLE: SystemId[] = SYSTEM_IDS.filter(
  (id) => id !== 'muscular' && id !== 'integumentary',
)

interface Snapshot {
  hiddenIds: string[]
  isolatedId: string | null
}

const AXIS_DEFAULTS: Record<ClipAxis, number> = {
  sagittal: 0,
  coronal: 0,
  transverse: 1.2,
}

export const useViewerStore = defineStore('viewer', () => {
  const visibleSystems = ref<SystemId[]>([...DEFAULT_VISIBLE])
  const systemOpacity = ref<Partial<Record<SystemId, number>>>({ integumentary: 0.25 })
  const hiddenIds = ref<string[]>([])
  const isolatedId = ref<string | null>(null)
  const selectedId = ref<string | null>(null)
  const dimOthers = ref(true)
  // The Z-Anatomy source is a male model, so male is the default.
  const sex = ref<Sex>('male')
  const clip = ref<ClipState>({ enabled: false, axis: 'transverse', position: AXIS_DEFAULTS.transverse })
  const panel = ref<PanelName>('none')
  /** Bumped whenever the camera should fly to the current selection. */
  const focusTick = ref(0)
  const undoStack = ref<Snapshot[]>([])

  const viewState = computed<ViewState>(() => ({
    visibleSystems: new Set(visibleSystems.value),
    systemOpacity: systemOpacity.value,
    hiddenIds: new Set(hiddenIds.value),
    isolatedId: isolatedId.value,
    selectedId: selectedId.value,
    dimOthers: dimOthers.value,
    sex: sex.value,
    clip: clip.value,
  }))

  const selected = computed(() => (selectedId.value ? structureById.get(selectedId.value) : undefined))

  function pushUndo(): void {
    undoStack.value.push({ hiddenIds: [...hiddenIds.value], isolatedId: isolatedId.value })
    if (undoStack.value.length > 30) undoStack.value.shift()
  }

  function undo(): void {
    const snap = undoStack.value.pop()
    if (!snap) return
    hiddenIds.value = snap.hiddenIds
    isolatedId.value = snap.isolatedId
  }

  function setPanel(next: PanelName): void {
    panel.value = panel.value === next ? 'none' : next
  }

  function toggleSystem(id: SystemId): void {
    visibleSystems.value = visibleSystems.value.includes(id)
      ? visibleSystems.value.filter((s) => s !== id)
      : [...visibleSystems.value, id]
  }

  function setAllSystems(on: boolean): void {
    visibleSystems.value = on ? [...SYSTEM_IDS] : []
  }

  function setOpacity(id: SystemId, value: number): void {
    systemOpacity.value = { ...systemOpacity.value, [id]: value }
  }

  /** Selects a structure, making it visible again if its system or id was hidden. */
  function select(id: string | null, options: { focus?: boolean } = {}): void {
    selectedId.value = id
    if (id === null) {
      if (panel.value === 'info') panel.value = 'none'
      return
    }
    const s = structureById.get(id)
    if (!s) return
    if (!visibleSystems.value.includes(s.system)) visibleSystems.value = [...visibleSystems.value, s.system]
    if (hiddenIds.value.includes(id)) hiddenIds.value = hiddenIds.value.filter((h) => h !== id)
    if (isolatedId.value && isolatedId.value !== id) isolatedId.value = null
    if (s.sex && s.sex !== sex.value) sex.value = s.sex
    panel.value = 'info'
    if (options.focus) focusTick.value++
  }

  function hideSelected(): void {
    if (!selectedId.value) return
    pushUndo()
    hiddenIds.value = [...hiddenIds.value, selectedId.value]
    selectedId.value = null
    panel.value = 'none'
  }

  function toggleIsolate(): void {
    if (!selectedId.value) return
    pushUndo()
    isolatedId.value = isolatedId.value === selectedId.value ? null : selectedId.value
  }

  function setClip(patch: Partial<ClipState>): void {
    const axisChanged = patch.axis !== undefined && patch.axis !== clip.value.axis
    clip.value = {
      ...clip.value,
      ...patch,
      ...(axisChanged && patch.position === undefined ? { position: AXIS_DEFAULTS[patch.axis!] } : {}),
    }
  }

  function resetView(): void {
    visibleSystems.value = [...DEFAULT_VISIBLE]
    systemOpacity.value = { integumentary: 0.25 }
    hiddenIds.value = []
    isolatedId.value = null
    selectedId.value = null
    clip.value = { enabled: false, axis: 'transverse', position: AXIS_DEFAULTS.transverse }
    undoStack.value = []
    panel.value = 'none'
  }

  return {
    visibleSystems,
    systemOpacity,
    hiddenIds,
    isolatedId,
    selectedId,
    dimOthers,
    sex,
    clip,
    panel,
    focusTick,
    undoStack,
    viewState,
    selected,
    setPanel,
    toggleSystem,
    setAllSystems,
    setOpacity,
    select,
    hideSelected,
    toggleIsolate,
    undo,
    setClip,
    resetView,
  }
})
