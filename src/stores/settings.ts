import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Locale } from '@/content/schema'
import { detectLocale, i18n, persistLocale } from '@/i18n'

export const useSettingsStore = defineStore('settings', () => {
  const locale = ref<Locale>(detectLocale())

  watch(
    locale,
    (value) => {
      i18n.global.locale.value = value
      document.documentElement.lang = value === 'zh' ? 'zh-CN' : 'en'
      document.title = i18n.global.t('app.title')
      persistLocale(value)
    },
    { immediate: true },
  )

  function toggleLocale(): void {
    locale.value = locale.value === 'zh' ? 'en' : 'zh'
  }

  return { locale, toggleLocale }
})
