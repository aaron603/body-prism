<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { structureById, systemById } from '@/content'
import { REGION_NAMES } from '@/content/schema'
import { useSettingsStore } from '@/stores/settings'
import { useViewerStore } from '@/stores/viewer'

const { t } = useI18n()
const viewer = useViewerStore()
const settings = useSettingsStore()

const s = computed(() => viewer.selected)
const lang = computed(() => settings.locale)
const system = computed(() => (s.value ? systemById.get(s.value.system) : undefined))
const isolated = computed(() => viewer.isolatedId !== null && viewer.isolatedId === s.value?.id)

const RELATION_KEYS = ['origin', 'insertion', 'innervation', 'bloodSupply'] as const

const relations = computed(() =>
  RELATION_KEYS.flatMap((key) => {
    const ids = s.value?.relations?.[key] ?? []
    return ids.length ? [{ key, items: ids.flatMap((id) => structureById.get(id) ?? []) }] : []
  }),
)

function nameOf(id: string): string {
  const target = structureById.get(id)
  return target ? (lang.value === 'zh' ? target.names.zh : target.names.en) : id
}
</script>

<template>
  <div v-if="s" class="info">
    <p class="names">
      <strong>{{ lang === 'zh' ? s.names.zh : s.names.en }}</strong>
      <span class="sub">{{ lang === 'zh' ? s.names.en : s.names.zh }}</span>
      <em class="la">{{ s.names.la }}</em>
    </p>
    <p class="tags">
      <span class="tag">{{ lang === 'zh' ? system?.names.zh : system?.names.en }}</span>
      <span class="tag">{{ REGION_NAMES[s.region][lang] }}</span>
    </p>

    <div class="actions">
      <button class="chip" type="button" @click="viewer.focusTick++">{{ t('info.focus') }}</button>
      <button class="chip" type="button" @click="viewer.toggleIsolate()">
        {{ isolated ? t('info.unisolate') : t('info.isolate') }}
      </button>
      <button class="chip" type="button" @click="viewer.hideSelected()">{{ t('info.hide') }}</button>
      <button v-if="viewer.undoStack.length" class="chip" type="button" @click="viewer.undo()">
        {{ t('info.undo') }}
      </button>
    </div>

    <p class="summary">{{ s.summary[lang] }}</p>
    <h3>{{ t('info.detail') }}</h3>
    <p>{{ s.detail[lang] }}</p>
    <template v-if="s.function">
      <h3>{{ t('info.function') }}</h3>
      <p>{{ s.function[lang] }}</p>
    </template>
    <template v-if="s.clinical">
      <h3>{{ t('info.clinical') }}</h3>
      <p>{{ s.clinical[lang] }}</p>
    </template>

    <template v-for="rel in relations" :key="rel.key">
      <h3>{{ t(`info.${rel.key}`) }}</h3>
      <p class="links">
        <button
          v-for="target in rel.items"
          :key="target.id"
          class="chip"
          type="button"
          @click="viewer.select(target.id, { focus: true })"
        >
          {{ nameOf(target.id) }}
        </button>
      </p>
    </template>
  </div>
</template>

<style scoped>
.info {
  font-size: 14px;
  line-height: 1.6;
}
.names {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}
.names strong {
  font-size: 18px;
}
.sub,
.la {
  color: var(--text-muted);
}
.tags,
.actions,
.links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0;
}
.tag {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--border);
  font-size: 12px;
}
.summary {
  font-weight: 600;
}
h3 {
  margin: 12px 0 2px;
  font-size: 13px;
  color: var(--text-muted);
}
p {
  margin: 4px 0;
}
</style>
