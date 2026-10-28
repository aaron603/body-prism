import {
  structureListSchema,
  SYSTEMS,
  type Locale,
  type Structure,
  type SystemId,
  type SystemMeta,
} from './schema'

const modules = import.meta.glob<Structure[]>('./structures/*.json', {
  eager: true,
  import: 'default',
})

/** Validates raw JSON lists and returns a flat list; throws on schema errors. */
export function loadStructures(raw: unknown[]): Structure[] {
  return raw.flatMap((list) => structureListSchema.parse(list))
}

/** Returns human-readable problems with duplicate ids or dangling references. */
export function findReferenceProblems(list: Structure[]): string[] {
  const problems: string[] = []
  const ids = new Set<string>()
  for (const s of list) {
    if (ids.has(s.id)) problems.push(`duplicate id: ${s.id}`)
    ids.add(s.id)
  }
  for (const s of list) {
    const refs = [...(s.parts ?? [])]
    for (const group of Object.values(s.relations ?? {})) refs.push(...(group ?? []))
    for (const ref of refs) {
      if (!ids.has(ref)) problems.push(`${s.id} references unknown id: ${ref}`)
    }
  }
  return problems
}

export const structures: Structure[] = loadStructures(Object.values(modules))

export const structureById: ReadonlyMap<string, Structure> = new Map(
  structures.map((s) => [s.id, s]),
)

export const systemById: ReadonlyMap<SystemId, SystemMeta> = new Map(
  SYSTEMS.map((s) => [s.id, s]),
)

export function structuresOfSystem(system: SystemId): Structure[] {
  return structures.filter((s) => s.system === system)
}

/** Primary display name: Chinese in zh locale, otherwise English. */
export function displayName(s: Structure, locale: Locale): string {
  return locale === 'zh' ? s.names.zh : s.names.en
}

export { SYSTEMS }
export type { Structure, SystemId, SystemMeta, Locale }
