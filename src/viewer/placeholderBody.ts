/**
 * Procedural stand-in for the Z-Anatomy glTF models.
 *
 * Coordinates are in metres, +y up, the figure faces +z, so the person's
 * left side is +x. Every builder returns the objects that make up one
 * structure; the viewer assigns materials and tags meshes with the id.
 * Replace this module with the glTF loader once the asset pipeline has run.
 */
import * as THREE from 'three'

type Vec3 = [number, number, number]

const UP = new THREE.Vector3(0, 1, 0)
const SIDES = [-1, 1] as const

/** Capsule spanning two points. */
function limb(a: Vec3, b: Vec3, radius: number): THREE.Mesh {
  const start = new THREE.Vector3(...a)
  const end = new THREE.Vector3(...b)
  const length = Math.max(start.distanceTo(end) - radius * 2, 0.001)
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 10))
  mesh.position.copy(start).add(end).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(UP, end.sub(start).normalize())
  return mesh
}

/** Ellipsoid at a position. */
function blob(pos: Vec3, scale: Vec3, rot: Vec3 = [0, 0, 0]): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14))
  mesh.position.set(...pos)
  mesh.scale.set(...scale)
  mesh.rotation.set(...rot)
  return mesh
}

function mirror(p: Vec3, side: number): Vec3 {
  return [p[0] * side, p[1], p[2]]
}

/** Builds one object per side, mirrored across the sagittal plane. */
function pair(build: (side: number) => THREE.Object3D): THREE.Object3D[] {
  return SIDES.map(build)
}

function limbPair(a: Vec3, b: Vec3, radius: number): THREE.Object3D[] {
  return pair((s) => limb(mirror(a, s), mirror(b, s), radius))
}

function ribRings(): THREE.Object3D[] {
  const rings: THREE.Object3D[] = []
  for (let i = 0; i < 7; i++) {
    const radius = 0.095 + Math.sin((i / 6) * Math.PI) * 0.04
    const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.005, 6, 28, Math.PI * 1.6))
    torus.rotation.x = Math.PI / 2 // lay the ring flat in the XZ plane
    const spin = new THREE.Group()
    spin.rotation.y = 0.3 * Math.PI // centre the gap at the back, where the spine is
    spin.add(torus)
    const ring = new THREE.Group()
    ring.scale.z = 0.75 // chest is shallower than it is wide
    ring.position.y = 1.38 - i * 0.04
    ring.add(spin)
    rings.push(ring)
  }
  return rings
}

function domeDiaphragm(): THREE.Object3D {
  const geometry = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)
  const dome = new THREE.Mesh(geometry)
  dome.position.set(0, 1.07, 0)
  dome.scale.set(0.13, 0.07, 0.09)
  return dome
}

function pelvisRing(): THREE.Object3D {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.026, 8, 24))
  ring.rotation.x = Math.PI / 2
  ring.scale.set(1, 0.8, 1) // squashes along the (rotated) torus' local y => depth
  ring.position.set(0, 0.93, 0)
  return ring
}

function skinShell(): THREE.Object3D[] {
  return [
    blob([0, 1.66, 0], [0.1, 0.12, 0.11]),
    limb([0, 1.5, 0], [0, 1.58, 0], 0.05),
    blob([0, 1.12, 0], [0.17, 0.37, 0.1]),
    ...limbPair([0.22, 1.4, 0], [0.24, 1.12, 0], 0.045),
    ...limbPair([0.24, 1.12, 0], [0.22, 0.85, 0.03], 0.035),
    ...pair((s) => blob([0.22 * s, 0.8, 0.03], [0.03, 0.05, 0.02])),
    ...limbPair([0.09, 0.85, 0], [0.08, 0.5, 0], 0.07),
    ...limbPair([0.08, 0.5, 0], [0.075, 0.08, 0], 0.05),
    ...pair((s) => blob([0.075 * s, 0.04, 0.06], [0.04, 0.03, 0.09])),
  ]
}

/** One builder per structure id; ids must match `src/content/structures/*.json`. */
export const PLACEHOLDER_BUILDERS: Record<string, () => THREE.Object3D[]> = {
  // Skeletal
  cranium: () => [blob([0, 1.66, 0], [0.095, 0.11, 0.1])],
  mandible: () => [blob([0, 1.575, 0.045], [0.06, 0.025, 0.05])],
  vertebral_column: () => [limb([0, 1.5, -0.065], [0, 0.88, -0.065], 0.016)],
  sternum: () => [blob([0, 1.3, 0.1], [0.022, 0.09, 0.01])],
  ribs: ribRings,
  clavicle: () => limbPair([0.02, 1.4, 0.07], [0.18, 1.41, 0.03], 0.008),
  scapula: () => pair((s) => blob([0.12 * s, 1.35, -0.08], [0.05, 0.06, 0.008])),
  humerus: () => limbPair([0.2, 1.4, 0], [0.22, 1.13, 0], 0.013),
  radius: () => limbPair([0.235, 1.13, 0.01], [0.215, 0.88, 0.03], 0.009),
  ulna: () => limbPair([0.205, 1.13, 0.0], [0.195, 0.88, 0.02], 0.009),
  hip_bone: () => [pelvisRing()],
  femur: () => limbPair([0.09, 0.88, 0], [0.08, 0.5, 0.01], 0.017),
  tibia: () => limbPair([0.08, 0.5, 0.01], [0.075, 0.08, 0], 0.013),
  fibula: () => limbPair([0.098, 0.5, 0], [0.09, 0.08, 0], 0.007),

  // Muscular
  sternocleidomastoid: () => limbPair([0.03, 1.4, 0.07], [0.07, 1.58, -0.01], 0.012),
  trapezius: () => [blob([0, 1.38, -0.085], [0.2, 0.12, 0.025])],
  deltoid: () => pair((s) => blob([0.2 * s, 1.38, 0], [0.05, 0.06, 0.05])),
  pectoralis_major: () => pair((s) => blob([0.08 * s, 1.3, 0.09], [0.08, 0.06, 0.022])),
  diaphragm: () => [domeDiaphragm()],
  latissimus_dorsi: () => pair((s) => blob([0.09 * s, 1.1, -0.09], [0.09, 0.14, 0.018])),
  biceps_brachii: () => limbPair([0.2, 1.35, 0.025], [0.21, 1.15, 0.02], 0.021),
  triceps_brachii: () => limbPair([0.2, 1.35, -0.025], [0.21, 1.15, -0.02], 0.021),
  rectus_abdominis: () => limbPair([0.03, 1.18, 0.1], [0.03, 0.95, 0.1], 0.02),
  gluteus_maximus: () => pair((s) => blob([0.09 * s, 0.9, -0.08], [0.08, 0.08, 0.06])),
  quadriceps_femoris: () => limbPair([0.09, 0.85, 0.04], [0.08, 0.53, 0.04], 0.04),
  hamstrings: () => limbPair([0.09, 0.85, -0.03], [0.08, 0.53, -0.03], 0.035),
  gastrocnemius: () => limbPair([0.08, 0.46, -0.03], [0.075, 0.25, -0.03], 0.03),

  // Cardiovascular
  heart: () => [blob([0.025, 1.24, 0.05], [0.05, 0.06, 0.045], [0, 0, -0.4])],
  aorta: () => [
    limb([0, 1.24, 0.03], [0, 1.34, 0.02], 0.014),
    limb([0, 1.34, 0.02], [-0.015, 1.34, -0.02], 0.014),
    limb([-0.015, 1.34, -0.02], [-0.015, 0.92, -0.03], 0.014),
    limb([-0.015, 0.92, -0.03], [0.05, 0.85, -0.01], 0.008),
    limb([-0.015, 0.92, -0.03], [-0.08, 0.85, -0.01], 0.008),
  ],
  common_carotid_artery: () => limbPair([0.03, 1.38, 0.02], [0.035, 1.58, 0.03], 0.006),
  brachial_artery: () => limbPair([0.19, 1.37, 0.015], [0.2, 1.13, 0], 0.005),
  femoral_artery: () => limbPair([0.07, 0.88, 0.03], [0.07, 0.55, 0], 0.007),
  superior_vena_cava: () => [limb([-0.04, 1.38, 0.02], [-0.035, 1.27, 0.03], 0.01)],
  inferior_vena_cava: () => [limb([-0.03, 1.15, -0.04], [-0.04, 0.92, -0.04], 0.014)],
  great_saphenous_vein: () => limbPair([0.06, 0.8, 0.03], [0.065, 0.1, 0.01], 0.005),

  // Nervous
  brain: () => [blob([0, 1.67, 0], [0.08, 0.085, 0.09])],
  cerebellum: () => [blob([0, 1.615, -0.055], [0.04, 0.03, 0.035])],
  spinal_cord: () => [limb([0, 1.58, -0.065], [0, 0.95, -0.065], 0.008)],
  brachial_plexus: () => limbPair([0.04, 1.42, -0.04], [0.17, 1.4, 0], 0.006),
  phrenic_nerve: () => limbPair([0.05, 1.45, 0.02], [0.05, 1.12, 0.03], 0.004),
  vagus_nerve: () =>
    pair((s) => limb(mirror([0.04, 1.55, 0.01], s), mirror([0.02, 1.12, 0.06], s), 0.004)),
  femoral_nerve: () => limbPair([0.075, 0.9, 0.03], [0.07, 0.6, 0.03], 0.006),
  sciatic_nerve: () => limbPair([0.08, 0.88, -0.05], [0.08, 0.5, -0.04], 0.01),

  // Respiratory
  larynx: () => [limb([0, 1.52, 0.04], [0, 1.49, 0.04], 0.018)],
  trachea: () => [limb([0, 1.49, 0.04], [0, 1.34, 0.04], 0.011)],
  bronchi: () => limbPair([0.0, 1.34, 0.04], [0.04, 1.29, 0.04], 0.009),
  right_lung: () => [blob([-0.075, 1.26, 0.0], [0.055, 0.12, 0.07])],
  left_lung: () => [blob([0.075, 1.26, 0.0], [0.048, 0.12, 0.065])],

  // Digestive
  esophagus: () => [limb([0, 1.49, 0.02], [0.01, 1.17, 0.0], 0.008)],
  stomach: () => [blob([0.06, 1.08, 0.05], [0.06, 0.055, 0.04], [0, 0, 0.5])],
  liver: () => [blob([-0.06, 1.1, 0.04], [0.1, 0.05, 0.06])],
  gallbladder: () => [blob([-0.07, 1.04, 0.08], [0.015, 0.022, 0.015])],
  pancreas: () => [limb([-0.03, 1.02, 0.0], [0.07, 1.04, -0.01], 0.012)],
  small_intestine: () => [blob([0, 0.96, 0.05], [0.09, 0.055, 0.045])],
  large_intestine: () => [
    limb([-0.1, 0.9, 0.03], [-0.1, 1.03, 0.03], 0.017),
    limb([-0.1, 1.03, 0.03], [0.1, 1.03, 0.03], 0.017),
    limb([0.1, 1.03, 0.03], [0.1, 0.9, 0.03], 0.017),
    limb([0.1, 0.9, 0.03], [0.0, 0.84, 0.04], 0.017),
  ],

  // Urinary
  kidneys: () => pair((s) => blob([0.05 * s, 1.08, -0.05], [0.025, 0.045, 0.02])),
  ureters: () => limbPair([0.05, 1.04, -0.05], [0.02, 0.88, 0.0], 0.004),
  urinary_bladder: () => [blob([0, 0.85, 0.05], [0.035, 0.035, 0.035])],

  // Reproductive
  uterus: () => [blob([0, 0.92, 0.03], [0.035, 0.05, 0.03])],
  ovaries: () => pair((s) => blob([0.065 * s, 0.93, 0.01], [0.015, 0.012, 0.012])),
  prostate: () => [blob([0, 0.82, 0.03], [0.02, 0.02, 0.02])],
  testes: () => pair((s) => blob([0.02 * s, 0.72, 0.05], [0.014, 0.022, 0.014])),

  // Endocrine
  pituitary_gland: () => [blob([0, 1.63, 0.03], [0.008, 0.008, 0.008])],
  thyroid_gland: () => pair((s) => blob([0.018 * s, 1.46, 0.045], [0.012, 0.025, 0.012])),
  adrenal_glands: () => pair((s) => blob([0.05 * s, 1.13, -0.05], [0.014, 0.008, 0.012])),

  // Lymphatic
  spleen: () => [blob([0.1, 1.1, -0.04], [0.025, 0.05, 0.03])],
  thymus: () => [blob([0, 1.34, 0.07], [0.03, 0.04, 0.015])],

  // Integumentary
  skin: skinShell,
}
