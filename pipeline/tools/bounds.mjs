// Prints the world-space bounding box of a glb, or of named nodes inside it.
// Usage: node pipeline/tools/bounds.mjs <file.glb> [nodeName ...]
import { NodeIO } from '@gltf-transform/core'
import { getBounds } from '@gltf-transform/functions'

const [file, ...names] = process.argv.slice(2)
if (!file) {
  console.error('usage: bounds.mjs <file.glb> [nodeName ...]')
  process.exit(1)
}

const doc = await new NodeIO().read(file)
const root = doc.getRoot()
const fmt = (v) => v.map((n) => n.toFixed(3)).join(', ')

function report(label, target) {
  const { min, max } = getBounds(target)
  const size = max.map((m, i) => m - min[i])
  console.log(`${label}\n  min  [${fmt(min)}]\n  max  [${fmt(max)}]\n  size [${fmt(size)}]`)
}

report('scene', root.listScenes()[0])
for (const name of names) {
  const node = root.listNodes().find((n) => n.getName() === name)
  if (node) report(name, node)
  else console.log(`${name}: not found`)
}
