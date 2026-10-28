import { get, set } from 'idb-keyval'

const WRONG_KEY = 'personbody.quiz.wrong'
const BEST_KEY = 'personbody.quiz.best'

/** IndexedDB can be unavailable (private mode, blocked storage); callers still work without it. */
async function safeGet<T>(key: string, fallback: T): Promise<T> {
  try {
    return (await get<T>(key)) ?? fallback
  } catch {
    return fallback
  }
}

async function safeSet(key: string, value: unknown): Promise<void> {
  try {
    await set(key, value)
  } catch {
    // non-fatal: progress just will not persist
  }
}

export function loadWrongIds(): Promise<string[]> {
  return safeGet<string[]>(WRONG_KEY, [])
}

export async function recordResult(correctIds: string[], wrongIds: string[]): Promise<string[]> {
  const current = new Set(await loadWrongIds())
  for (const id of correctIds) current.delete(id)
  for (const id of wrongIds) current.add(id)
  const next = [...current]
  await safeSet(WRONG_KEY, next)
  return next
}

export function loadBestScore(): Promise<number> {
  return safeGet<number>(BEST_KEY, 0)
}

export async function saveBestScore(score: number): Promise<number> {
  const best = Math.max(score, await loadBestScore())
  await safeSet(BEST_KEY, best)
  return best
}
