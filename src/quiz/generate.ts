import type { Structure, SystemId } from '@/content/schema'

export type QuestionType = 'pick' | 'identify' | 'translate'

export interface Question {
  type: QuestionType
  /** The structure that is the correct answer. */
  targetId: string
  /** Four structure ids including the target; empty for `pick` questions. */
  choiceIds: string[]
}

export interface GenerateOptions {
  count: number
  system?: SystemId
  /** Restrict the pool to these ids (used for the missed-question book). */
  onlyIds?: string[]
  /** Ids that exist in the 3D model; `pick`/`identify` need them. */
  modelIds: ReadonlySet<string>
  random?: () => number
}

const CHOICES = 4
const TYPES: QuestionType[] = ['pick', 'identify', 'translate']

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function pickDistractors(target: Structure, pool: Structure[], random: () => number): Structure[] {
  const others = pool.filter((s) => s.id !== target.id)
  const sameSystem = shuffle(others.filter((s) => s.system === target.system), random)
  const rest = shuffle(others.filter((s) => s.system !== target.system), random)
  return [...sameSystem, ...rest].slice(0, CHOICES - 1)
}

/** Builds a randomised quiz; skin is excluded because it covers every pick. */
export function generateQuiz(structures: Structure[], options: GenerateOptions): Question[] {
  const random = options.random ?? Math.random
  const eligible = structures.filter(
    (s) =>
      s.system !== 'integumentary' &&
      options.modelIds.has(s.id) &&
      (!options.system || s.system === options.system) &&
      (!options.onlyIds || options.onlyIds.includes(s.id)),
  )
  // Distractors may come from anywhere so small pools still yield four choices.
  const distractorPool = structures.filter((s) => s.system !== 'integumentary')
  if (eligible.length === 0 || distractorPool.length < CHOICES) return []

  const targets = shuffle(eligible, random)
  const questions: Question[] = []
  for (let i = 0; i < options.count; i++) {
    const target = targets[i % targets.length]
    const type = TYPES[Math.floor(random() * TYPES.length)]
    const choiceIds =
      type === 'pick'
        ? []
        : shuffle([target, ...pickDistractors(target, distractorPool, random)], random).map((s) => s.id)
    questions.push({ type, targetId: target.id, choiceIds })
  }
  return questions
}

export function isCorrect(question: Question, answerId: string | null): boolean {
  return answerId === question.targetId
}
