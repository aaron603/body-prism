import { describe, expect, it } from 'vitest'
import { collectGeometry, isStructureGeometry, type TreeApi } from '../../pipeline/tools/nodeFilter.ts'

interface N {
  name: string
  mesh?: boolean
  kids?: N[]
}

const api: TreeApi<N> = {
  name: (n) => n.name,
  hasMesh: (n) => n.mesh === true,
  children: (n) => n.kids ?? [],
}

describe('isStructureGeometry', () => {
  it.each(['Femur.r', 'Femur.l', 'Mandible', 'Vertebra T10', 'Atlas (C1)', 'Ribs.g'])(
    'keeps %s',
    (name) => expect(isStructureGeometry(name)).toBe(true),
  )

  it.each([
    'Femur.j',
    'Sternal angle.t',
    'Costal groove.s',
    'Rib.i',
    'Brachialis muscle.or',
    'Pectoralis major muscle.er',
    'Sternocostal head pectoralis major muscle.e1l',
    'Triceps.o4r',
    'Something.e26r',
    'Thing.001',
  ])('drops %s', (name) => expect(isStructureGeometry(name)).toBe(false))
})

describe('collectGeometry', () => {
  it('keeps bone meshes and skips overlays and label pins', () => {
    const tree: N = {
      name: 'Humerus.r',
      mesh: true,
      kids: [
        { name: 'Brachialis muscle.or', mesh: true },
        { name: 'Deltoid tuberosity.t' },
        { name: 'Humerus.j', mesh: true },
        { name: 'Head of humerus', mesh: true },
      ],
    }
    expect(collectGeometry(tree, api).map((n) => n.name)).toEqual(['Humerus.r', 'Head of humerus'])
  })

  it('walks through group nodes that have no mesh', () => {
    const tree: N = {
      name: 'Ribs.g',
      kids: [
        { name: 'First rib.r', mesh: true },
        { name: 'Ribs.j', mesh: true },
        { name: 'Sub group.g', kids: [{ name: 'Second rib.l', mesh: true }] },
      ],
    }
    expect(collectGeometry(tree, api).map((n) => n.name)).toEqual(['First rib.r', 'Second rib.l'])
  })

  it('does not descend into dropped nodes', () => {
    const tree: N = { name: 'Bone', mesh: true, kids: [{ name: 'Overlay.or', kids: [{ name: 'Inner', mesh: true }] }] }
    expect(collectGeometry(tree, api).map((n) => n.name)).toEqual(['Bone'])
  })
})
