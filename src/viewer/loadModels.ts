import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import type { AnatomyViewer } from './AnatomyViewer'

interface Manifest {
  [system: string]: { file: string }
}

/**
 * Loads every system listed in models/manifest.json and swaps its meshes into the viewer.
 * Structures without a model keep their placeholder, so a missing file is never fatal.
 * Returns the ids that were replaced.
 */
export async function loadModels(
  viewer: AnatomyViewer,
  isAlive: () => boolean,
  base: string = import.meta.env.BASE_URL,
): Promise<string[]> {
  let manifest: Manifest
  try {
    const res = await fetch(`${base}models/manifest.json`)
    if (!res.ok) return []
    manifest = (await res.json()) as Manifest
  } catch {
    return []
  }

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  const applied: string[] = []
  for (const [system, { file }] of Object.entries(manifest)) {
    try {
      const gltf = await loader.loadAsync(`${base}models/${file}`)
      if (!isAlive()) return applied
      applied.push(...viewer.applyModel(gltf.scene))
    } catch (err) {
      console.warn(`[viewer] could not load model for "${system}"`, err)
    }
  }
  return applied
}
