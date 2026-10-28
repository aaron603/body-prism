import { onBeforeUnmount, onMounted, shallowRef, type Ref } from 'vue'
import { structures } from '@/content'
import { AnatomyViewer, isWebGLAvailable } from '@/viewer/AnatomyViewer'
import { loadModels } from '@/viewer/loadModels'

/**
 * Owns an AnatomyViewer for the lifetime of a component. The viewer lives in a
 * shallowRef so Vue never proxies the three.js objects inside it.
 */
export function useViewer(container: Ref<HTMLElement | null>, onPick: (id: string | null) => void) {
  const viewer = shallowRef<AnatomyViewer | null>(null)
  const webglOk = isWebGLAvailable()

  onMounted(() => {
    const el = container.value
    if (!webglOk || !el) return
    const v = new AnatomyViewer({ container: el, structures, onPick })
    viewer.value = v
    // Placeholders show immediately; real meshes replace them as each system arrives.
    void loadModels(v, () => viewer.value === v).then((ids) => {
      if (viewer.value === v) el.dataset.models = ids.join(',')
    })
  })

  onBeforeUnmount(() => {
    viewer.value?.dispose()
    viewer.value = null
  })

  return { viewer, webglOk }
}
