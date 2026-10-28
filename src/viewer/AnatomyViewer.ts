import * as THREE from 'three'
import CameraControls from 'camera-controls'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh'
import { SYSTEMS, type Structure } from '@/content/schema'
import { PLACEHOLDER_BUILDERS } from './placeholderBody'
import {
  defaultViewState,
  type ClipAxis,
  type EntryMeta,
  type ViewPreset,
  type ViewState,
} from './types'
import { entryOpacity, isEntryVisible } from './visibility'

CameraControls.install({
  THREE: {
    Vector2: THREE.Vector2,
    Vector3: THREE.Vector3,
    Vector4: THREE.Vector4,
    Quaternion: THREE.Quaternion,
    Matrix4: THREE.Matrix4,
    Spherical: THREE.Spherical,
    Box3: THREE.Box3,
    Sphere: THREE.Sphere,
    Raycaster: THREE.Raycaster,
  },
})

const SKIN_COLOR = 0xf0b9a0
const HIGHLIGHT = 0x2563eb
const BODY_CENTER = new THREE.Vector3(0, 0.95, 0)
const PRESET_DISTANCE = 2.9
const TAP_MAX_MOVE = 6
const TAP_MAX_MS = 350

const PRESETS: Record<ViewPreset, [number, number, number]> = {
  front: [0, 0.95, PRESET_DISTANCE],
  back: [0, 0.95, -PRESET_DISTANCE],
  left: [PRESET_DISTANCE, 0.95, 0],
  right: [-PRESET_DISTANCE, 0.95, 0],
  top: [0, 0.95 + PRESET_DISTANCE, 0.01],
}

// Normals point at the side that is kept; the +x/+y/+z side is cut away.
const CLIP_NORMALS: Record<ClipAxis, [number, number, number]> = {
  sagittal: [-1, 0, 0],
  coronal: [0, 0, -1],
  transverse: [0, -1, 0],
}

interface Entry {
  meta: EntryMeta
  group: THREE.Group
  material: THREE.MeshStandardMaterial
  meshes: THREE.Mesh[]
}

export interface ViewerOptions {
  container: HTMLElement
  structures: Structure[]
  /** Called on a tap; id is null when the tap hit nothing. */
  onPick: (id: string | null) => void
}

/** True when a WebGL context can be created in this browser. */
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export class AnatomyViewer {
  private readonly container: HTMLElement
  private readonly onPick: (id: string | null) => void
  private readonly renderer: THREE.WebGLRenderer
  private readonly labelRenderer = new CSS2DRenderer()
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.05, 30)
  private readonly controls: CameraControls
  private readonly clock = new THREE.Clock()
  private readonly raycaster = new THREE.Raycaster()
  private readonly entries = new Map<string, Entry>()
  private readonly clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1.2)
  private readonly keyLight = new THREE.DirectionalLight(0xffffff, 1.6)
  private readonly lightOffset = new THREE.Vector3(1.5, 2, 2)
  private readonly labelEl = document.createElement('div')
  private readonly label: CSS2DObject
  private readonly resizeObserver: ResizeObserver
  private state: ViewState = defaultViewState()
  private labelText: string | null = null
  private dirty = true
  private frameId = 0
  private pointerStart: { x: number; y: number; t: number } | null = null

  constructor(options: ViewerOptions) {
    this.container = options.container
    this.onPick = options.onPick

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.localClippingEnabled = false
    this.container.appendChild(this.renderer.domElement)
    this.renderer.domElement.style.touchAction = 'none'

    this.labelRenderer.domElement.style.position = 'absolute'
    this.labelRenderer.domElement.style.inset = '0'
    this.labelRenderer.domElement.style.pointerEvents = 'none'
    this.container.appendChild(this.labelRenderer.domElement)

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.1))
    this.scene.add(this.keyLight)
    this.scene.add(this.buildGround())

    this.labelEl.className = 'viewer-label'
    this.label = new CSS2DObject(this.labelEl)
    this.label.visible = false
    this.scene.add(this.label)

    this.buildEntries(options.structures)

    this.controls = new CameraControls(this.camera, this.renderer.domElement)
    this.configureControls()
    this.setPreset('front', false)

    const el = this.renderer.domElement
    el.addEventListener('pointerdown', this.handlePointerDown)
    el.addEventListener('pointerup', this.handlePointerUp)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.container)
    this.resize()

    this.frameId = requestAnimationFrame(this.loop)
  }

  private buildGround(): THREE.Object3D {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.37, 64),
      new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.5 }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.005
    return ring
  }

  private buildEntries(structures: Structure[]): void {
    const colors = new Map(SYSTEMS.map((s) => [s.id, s.color]))
    for (const s of structures) {
      const build = PLACEHOLDER_BUILDERS[s.id]
      if (!build) {
        console.warn(`[viewer] no placeholder geometry for "${s.id}"`)
        continue
      }
      const material = new THREE.MeshStandardMaterial({
        color: s.system === 'integumentary' ? SKIN_COLOR : (colors.get(s.system) ?? 0xcccccc),
        roughness: 0.65,
        metalness: 0.05,
        clippingPlanes: [this.clipPlane],
      })
      const group = new THREE.Group()
      group.visible = false
      const meshes: THREE.Mesh[] = []
      for (const obj of build()) {
        group.add(obj)
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) meshes.push(this.prepareMesh(child, s.id, material))
        })
      }
      this.scene.add(group)
      this.entries.set(s.id, { meta: { id: s.id, system: s.system, sex: s.sex }, group, material, meshes })
    }
    this.scene.updateMatrixWorld(true)
  }

  /** Tags a mesh with its structure id and gives it a BVH so picking stays cheap on dense meshes. */
  private prepareMesh(mesh: THREE.Mesh, id: string, material: THREE.Material): THREE.Mesh {
    mesh.material = material
    mesh.userData.structureId = id
    mesh.geometry.boundsTree = new MeshBVH(mesh.geometry)
    mesh.raycast = acceleratedRaycast
    return mesh
  }

  /**
   * Swaps placeholder geometry for loaded meshes. Each top-level node of `root` must be
   * named after a structure id; unknown nodes are ignored. Returns the ids that were applied.
   */
  applyModel(root: THREE.Object3D): string[] {
    const applied: string[] = []
    for (const node of [...root.children]) {
      const entry = this.entries.get(node.name)
      if (!entry) continue
      for (const old of [...entry.group.children]) {
        entry.group.remove(old)
        old.traverse((o) => o instanceof THREE.Mesh && o.geometry.dispose())
      }
      entry.meshes = []
      entry.group.add(node)
      node.traverse((child) => {
        if (child instanceof THREE.Mesh) entry.meshes.push(this.prepareMesh(child, entry.meta.id, entry.material))
      })
      applied.push(node.name)
    }
    this.scene.updateMatrixWorld(true)
    this.updateLabel()
    this.dirty = true
    return applied
  }

  private configureControls(): void {
    const c = this.controls
    c.minDistance = 0.3
    c.maxDistance = 6
    c.dollyToCursor = true
    c.smoothTime = 0.15
    c.draggingSmoothTime = 0.08
    c.setBoundary(new THREE.Box3(new THREE.Vector3(-1, -0.2, -1), new THREE.Vector3(1, 2.1, 1)))
    c.mouseButtons.left = CameraControls.ACTION.ROTATE
    c.mouseButtons.right = CameraControls.ACTION.TRUCK
    c.mouseButtons.wheel = CameraControls.ACTION.DOLLY
    c.touches.one = CameraControls.ACTION.TOUCH_ROTATE
    c.touches.two = CameraControls.ACTION.TOUCH_DOLLY_TRUCK
    c.touches.three = CameraControls.ACTION.TOUCH_TRUCK
    c.addEventListener('update', () => {
      this.dirty = true
    })
  }

  private resize(): void {
    const { clientWidth: w, clientHeight: h } = this.container
    if (w === 0 || h === 0) return
    this.renderer.setSize(w, h)
    this.labelRenderer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.dirty = true
  }

  private readonly loop = (): void => {
    this.frameId = requestAnimationFrame(this.loop)
    const moved = this.controls.update(this.clock.getDelta())
    if (!moved && !this.dirty) return
    this.dirty = false
    this.keyLight.position.copy(this.camera.position).add(this.lightOffset)
    this.renderer.render(this.scene, this.camera)
    this.labelRenderer.render(this.scene, this.camera)
  }

  private readonly handlePointerDown = (e: PointerEvent): void => {
    // Only the primary pointer can start a tap, so pinch gestures never trigger a pick.
    this.pointerStart = e.isPrimary ? { x: e.clientX, y: e.clientY, t: performance.now() } : null
  }

  private readonly handlePointerUp = (e: PointerEvent): void => {
    const start = this.pointerStart
    this.pointerStart = null
    if (!start || !e.isPrimary) return
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y)
    if (moved > TAP_MAX_MOVE || performance.now() - start.t > TAP_MAX_MS) return
    this.onPick(this.pickAt(e.clientX, e.clientY))
  }

  /** Returns the id of the visible structure under the screen point, or null. */
  private pickAt(clientX: number, clientY: number): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1),
    )
    this.raycaster.setFromCamera(ndc, this.camera)

    const targets: THREE.Mesh[] = []
    for (const entry of this.entries.values()) {
      if (isEntryVisible(entry.meta, this.state)) targets.push(...entry.meshes)
    }
    const hits = this.raycaster.intersectObjects(targets, false)

    let skinHit: string | null = null
    for (const hit of hits) {
      // Clipped-away geometry is invisible, so it must not be pickable either.
      if (this.state.clip.enabled && this.clipPlane.distanceToPoint(hit.point) < 0) continue
      const id = hit.object.userData.structureId as string
      if (this.entries.get(id)?.meta.system === 'integumentary') {
        skinHit ??= id
        continue
      }
      return id
    }
    return skinHit
  }

  /** Applies a new view state: visibility, opacity, highlight and clipping. */
  setState(state: ViewState): void {
    this.state = state
    const { clip } = state
    const [nx, ny, nz] = CLIP_NORMALS[clip.axis]
    this.clipPlane.normal.set(nx, ny, nz)
    // three.js keeps points where n·p + constant >= 0. Each normal is -1 on its axis,
    // so the kept side is axis <= position exactly when constant == position.
    this.clipPlane.constant = clip.position
    this.renderer.localClippingEnabled = clip.enabled

    for (const entry of this.entries.values()) {
      const visible = isEntryVisible(entry.meta, state)
      entry.group.visible = visible
      if (!visible) continue
      const opacity = entryOpacity(entry.meta, state)
      const m = entry.material
      m.opacity = opacity
      m.transparent = opacity < 1
      m.depthWrite = opacity >= 0.6
      const side = clip.enabled ? THREE.DoubleSide : THREE.FrontSide
      if (m.side !== side) {
        m.side = side
        m.needsUpdate = true
      }
      m.emissive.setHex(entry.meta.id === state.selectedId ? HIGHLIGHT : 0x000000)
      m.emissiveIntensity = entry.meta.id === state.selectedId ? 0.55 : 0
    }
    this.updateLabel()
    this.dirty = true
  }

  /** Sets the text shown above the selected structure; null hides the label. */
  setLabelText(text: string | null): void {
    this.labelText = text
    this.updateLabel()
    this.dirty = true
  }

  private updateLabel(): void {
    const entry = this.state.selectedId ? this.entries.get(this.state.selectedId) : undefined
    if (!entry || !entry.group.visible || !this.labelText) {
      this.label.visible = false
      return
    }
    const box = new THREE.Box3().setFromObject(entry.group)
    const center = box.getCenter(new THREE.Vector3())
    this.label.position.set(center.x, box.max.y + 0.02, center.z)
    this.labelEl.textContent = this.labelText
    this.label.visible = true
  }

  /** Smoothly frames a structure; distance scales with its size. */
  focusOn(id: string): void {
    const entry = this.entries.get(id)
    if (!entry) return
    const box = new THREE.Box3().setFromObject(entry.group)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3()).length()
    const distance = THREE.MathUtils.clamp(size * 2.2, 0.35, 2.4)
    void this.controls.moveTo(center.x, center.y, center.z, true)
    void this.controls.dollyTo(distance, true)
  }

  setPreset(preset: ViewPreset, animate = true): void {
    const [x, y, z] = PRESETS[preset]
    void this.controls.setLookAt(x, y, z, BODY_CENTER.x, BODY_CENTER.y, BODY_CENTER.z, animate)
  }

  /** Whether the structure exists in the loaded model. */
  has(id: string): boolean {
    return this.entries.has(id)
  }

  dispose(): void {
    cancelAnimationFrame(this.frameId)
    this.resizeObserver.disconnect()
    const el = this.renderer.domElement
    el.removeEventListener('pointerdown', this.handlePointerDown)
    el.removeEventListener('pointerup', this.handlePointerUp)
    this.controls.dispose()
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.boundsTree = undefined
        obj.geometry.dispose()
      }
    })
    for (const entry of this.entries.values()) entry.material.dispose()
    this.renderer.dispose()
    el.remove()
    this.labelRenderer.domElement.remove()
  }
}
