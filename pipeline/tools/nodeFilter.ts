/**
 * Z-Anatomy node naming, as observed in the FBX exports:
 *   .r / .l      real surface of a right / left structure (kept)
 *   (none)       real surface of a midline structure (kept)
 *   .g           pure grouping node, no mesh (traversed)
 *   .j .t .s .i  12-triangle label pins or empty text anchors (dropped)
 *   .o* .e*      muscle origin / insertion overlays painted on a bone (dropped);
 *                the muscles themselves live in the muscular system file
 */
const NON_GEOMETRY = /\.(?:[oe]\d*[rl]|[jtsi]|\d{3})$/

export function isStructureGeometry(name: string): boolean {
  return !NON_GEOMETRY.test(name)
}

export interface TreeApi<T> {
  name(node: T): string
  hasMesh(node: T): boolean
  children(node: T): T[]
}

/**
 * Collects every mesh node under `root` (inclusive) that is real surface geometry.
 * Subtrees of dropped nodes are skipped so overlays never leak into a structure.
 */
export function collectGeometry<T>(root: T, api: TreeApi<T>): T[] {
  const out: T[] = []
  const visit = (node: T): void => {
    if (!isStructureGeometry(api.name(node))) return
    if (api.hasMesh(node)) out.push(node)
    for (const child of api.children(node)) visit(child)
  }
  visit(root)
  return out
}
