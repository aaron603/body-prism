import Fuse from 'fuse.js'
import { pinyin } from 'pinyin-pro'
import type { Structure } from '@/content/schema'

interface SearchDoc {
  id: string
  zh: string
  en: string
  la: string
  synonyms: string[]
  pinyinFull: string
  pinyinInitials: string
}

function toDoc(s: Structure): SearchDoc {
  const zhTexts = [s.names.zh, ...(s.names.synonyms ?? []).filter((t) => /[一-鿿]/.test(t))]
  return {
    id: s.id,
    zh: s.names.zh,
    en: s.names.en,
    la: s.names.la,
    synonyms: s.names.synonyms ?? [],
    pinyinFull: zhTexts.map((t) => pinyin(t, { toneType: 'none', type: 'array' }).join('')).join(' '),
    pinyinInitials: zhTexts.map((t) => pinyin(t, { pattern: 'first', toneType: 'none', type: 'array' }).join('')).join(' '),
  }
}

export interface SearchIndex {
  search(query: string, limit?: number): Structure[]
}

/** Builds a fuzzy index over zh/en/Latin names, synonyms and pinyin. */
export function createSearchIndex(structures: Structure[]): SearchIndex {
  const byId = new Map(structures.map((s) => [s.id, s]))
  const fuse = new Fuse(structures.map(toDoc), {
    includeScore: true,
    threshold: 0.32,
    ignoreLocation: true,
    minMatchCharLength: 1,
    keys: [
      { name: 'zh', weight: 3 },
      { name: 'en', weight: 3 },
      { name: 'la', weight: 2 },
      { name: 'synonyms', weight: 2 },
      { name: 'pinyinFull', weight: 1.5 },
      { name: 'pinyinInitials', weight: 1 },
    ],
  })
  return {
    search(query, limit = 20) {
      const q = query.trim().toLowerCase()
      if (!q) return []
      return fuse
        .search(q, { limit })
        .map((r) => byId.get(r.item.id))
        .filter((s): s is Structure => s !== undefined)
    },
  }
}
