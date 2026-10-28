/**
 * Converts the downloaded Z-Anatomy FBX files to glb with FBX2glTF.
 * Output names are the lowercase file stems without the version digits.
 * Usage: node pipeline/tools/convert.ts [force]
 */
import { execFileSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const SRC = resolve(ROOT, 'pipeline/source/fbx')
const OUT = resolve(ROOT, 'pipeline/build/glb')
const PLATFORM_DIRS: Record<string, string> = { darwin: 'Darwin', linux: 'Linux', win32: 'Windows_NT' }
const BIN = resolve(
  ROOT,
  'node_modules/fbx2gltf/bin',
  PLATFORM_DIRS[process.platform] ?? '',
  process.platform === 'win32' ? 'FBX2glTF.exe' : 'FBX2glTF',
)

const force = process.argv[2] === 'force'

/** "Regions of human body100.fbx" -> "regions_of_human_body"; "CardioVascular41.fbx" -> "cardiovascular". */
export function outputName(file: string): string {
  return file
    .replace(/\.fbx$/i, '')
    .replace(/\d+$/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/system$/, '')
    .replace(/_$/, '')
}

if (process.argv[1] === import.meta.filename) {
  mkdirSync(OUT, { recursive: true })
  chmodSync(BIN, 0o755)
  for (const file of readdirSync(SRC).filter((f) => f.endsWith('.fbx'))) {
    const out = resolve(OUT, outputName(file))
    const src = resolve(SRC, file)
    if (!force && existsSync(`${out}.glb`) && statSync(`${out}.glb`).mtimeMs > statSync(src).mtimeMs) {
      console.log(`skip ${file}`)
      continue
    }
    console.log(`convert ${file}`)
    execFileSync(BIN, ['--binary', '--input', src, '--output', out], { stdio: ['ignore', 'ignore', 'inherit'] })
  }
}
