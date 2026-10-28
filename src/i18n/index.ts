import { createI18n } from 'vue-i18n'
import type { Locale } from '@/content/schema'
import en from './en'
import zh from './zh'

const STORAGE_KEY = 'personbody.locale'

export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {
    // storage may be blocked; fall through to the browser language
  }
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // non-fatal: the choice just will not survive a reload
  }
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: { zh, en },
})
