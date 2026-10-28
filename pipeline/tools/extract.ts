/**
 * Builds one optimised glb per body system from the converted Z-Anatomy sources.
 * Each structure becomes a top-level node named after its content id, holding the
 * real surface meshes with their world transform baked into the node matrix.
 *
 * Usage: node pipeline/tools/extract.ts [systemOut ...]
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { NodeIO, type Node } from '@gltf-transform/core'
import { EXTMeshoptCompression } from '@gltf-transform/extensions'
import { getBounds, prune, reorder, simplify, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import { collectGeometry, type TreeApi } from './nodeFilter.ts'

interface SystemConfig {
  out: string
  source: string
  /** Fraction of vertices to keep when simplifying. */
  ratio: number
  /** Simplification error limit as a fraction of mesh radius. */
  error: number
  /** Content structure id -> source node names that make it up. */
  structures: Record<string, string[]>
}

interface StructureStats {
  tris: number
  bounds: { min: number[]; max: number[] }
}

const ROOT = resolve(import.meta.dirname, '../..')
const OUT_DIR = resolve(ROOT, 'public/models')

const api: TreeApi<Node> = {
  name: (n) => n.getName(),
  hasMesh: (n) => n.getMesh() !== null,
  children: (n) => n.listChildren(),
}

function countTris(node: Node): number {
  let tris = 0
  node.traverse((n) => {
    for (const prim of n.getMesh()?.listPrimitives() ?? []) {
      tris += (prim.getIndices()?.getCount() ?? 0) / 3
    }
  })
  return tris
}

async function extractSystem(io: NodeIO, cfg: SystemConfig) {
  const doc = await io.read(resolve(ROOT, 'pipeline/build/glb', `${cfg.source}.glb`))
  const root = doc.getRoot()
  const originals = root.listNodes()
  const byName = new Map<string, Node[]>()
  for (const n of originals) byName.set(n.getName(), [...(byName.get(n.getName()) ?? []), n])

  const claimed = new Set<Node>()
  const holders: Node[] = []
  for (const [id, names] of Object.entries(cfg.structures)) {
    const holder = doc.createNode(id)
    for (const spec of names) {
      // A leading "=" takes only that node's own mesh and ignores its children
      // (e.g. the aorta node carries every branch artery below it).
      const ownOnly = spec.startsWith('=')
      const name = ownOnly ? spec.slice(1) : spec
      const matches = byName.get(name) ?? []
      if (matches.length !== 1) {
        throw new Error(`${cfg.out}/${id}: expected one node named "${name}", found ${matches.length}`)
      }
      const geometry = ownOnly
        ? matches[0].getMesh() ? [matches[0]] : []
        : collectGeometry(matches[0], api)
      for (const geo of geometry) {
        if (claimed.has(geo)) {
          throw new Error(`${cfg.out}/${id}: "${geo.getName()}" already belongs to another structure`)
        }
        claimed.add(geo)
        holder.addChild(
          doc.createNode(geo.getName()).setMatrix(geo.getWorldMatrix()).setMesh(geo.getMesh()),
        )
      }
    }
    if (holder.listChildren().length === 0) throw new Error(`${cfg.out}/${id}: no geometry found`)
    holders.push(holder)
  }

  const scene = root.listScenes()[0]
  for (const child of scene.listChildren()) scene.removeChild(child)
  for (const holder of holders) scene.addChild(holder)
  for (const node of originals) node.dispose()

  // The viewer supplies its own materials, so only positions and normals are kept.
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      for (const semantic of prim.listSemantics()) {
        if (semantic !== 'POSITION' && semantic !== 'NORMAL') prim.setAttribute(semantic, null)
      }
      prim.setMaterial(null)
    }
  }

  const before = holders.reduce((sum, h) => sum + countTris(h), 0)
  await doc.transform(
    prune(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: cfg.ratio, error: cfg.error }),
    prune(),
    reorder({ encoder: MeshoptEncoder }),
  )
  // meshopt() would also quantise positions; the BVH needs float32, so compress only.
  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE })

  const structures: Record<string, StructureStats> = {}
  for (const holder of holders) {
    const { min, max } = getBounds(holder)
    structures[holder.getName()] = { tris: countTris(holder), bounds: { min, max } }
  }
  mkdirSync(OUT_DIR, { recursive: true })
  const file = resolve(OUT_DIR, `${cfg.out}.glb`)
  await io.write(file, doc)
  const after = Object.values(structures).reduce((sum, s) => sum + s.tris, 0)
  console.log(`${cfg.out}: ${before} -> ${after} tris, ${(statSync(file).size / 1e6).toFixed(2)} MB`)
  return { file: `${cfg.out}.glb`, bytes: statSync(file).size, structures }
}

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready])
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })

const map = JSON.parse(readFileSync(resolve(ROOT, 'pipeline/structure_map.json'), 'utf8')) as {
  systems: SystemConfig[]
}
const only = new Set(process.argv.slice(2))
const manifestPath = resolve(OUT_DIR, 'manifest.json')
const manifest: Record<string, unknown> = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : {}

for (const cfg of map.systems) {
  if (only.size && !only.has(cfg.out)) continue
  manifest[cfg.out] = await extractSystem(io, cfg)
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
