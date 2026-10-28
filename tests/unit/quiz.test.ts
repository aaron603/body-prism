import { describe, expect, it } from 'vitest'
import { structures } from '@/content'
import { generateQuiz, isCorrect } from '@/quiz/generate'

const modelIds = new Set(structures.map((s) => s.id))

/** Deterministic LCG so failures are reproducible. */
function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

describe('generateQuiz', () => {
  it('produces the requested number of questions', () => {
    const quiz = generateQuiz(structures, { count: 10, modelIds, random: seeded(1) })
    expect(quiz).toHaveLength(10)
  })

  it('gives choice questions four unique choices including the answer', () => {
    const quiz = generateQuiz(structures, { count: 30, modelIds, random: seeded(2) })
    for (const q of quiz.filter((x) => x.type !== 'pick')) {
      expect(q.choiceIds).toHaveLength(4)
      expect(new Set(q.choiceIds).size).toBe(4)
      expect(q.choiceIds).toContain(q.targetId)
    }
  })

  it('leaves choices empty for pick questions', () => {
    const quiz = generateQuiz(structures, { count: 30, modelIds, random: seeded(3) })
    for (const q of quiz.filter((x) => x.type === 'pick')) expect(q.choiceIds).toEqual([])
  })

  it('never asks about skin', () => {
    const quiz = generateQuiz(structures, { count: 60, modelIds, random: seeded(4) })
    expect(quiz.some((q) => q.targetId === 'skin')).toBe(false)
  })

  it('respects the system filter', () => {
    const quiz = generateQuiz(structures, { count: 8, system: 'skeletal', modelIds, random: seeded(5) })
    const bySystem = new Map(structures.map((s) => [s.id, s.system]))
    expect(quiz.every((q) => bySystem.get(q.targetId) === 'skeletal')).toBe(true)
  })

  it('restricts to onlyIds for missed-question practice', () => {
    const quiz = generateQuiz(structures, { count: 5, onlyIds: ['heart', 'liver'], modelIds, random: seeded(6) })
    expect(quiz.every((q) => q.targetId === 'heart' || q.targetId === 'liver')).toBe(true)
  })

  it('returns an empty quiz when nothing is eligible', () => {
    expect(generateQuiz(structures, { count: 5, onlyIds: ['nope'], modelIds })).toEqual([])
  })

  it('checks answers', () => {
    const [q] = generateQuiz(structures, { count: 1, modelIds, random: seeded(7) })
    expect(isCorrect(q, q.targetId)).toBe(true)
    expect(isCorrect(q, null)).toBe(false)
  })
})
