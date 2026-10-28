<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SYSTEMS } from '@/content'
import { useSettingsStore } from '@/stores/settings'
import { useViewerStore } from '@/stores/viewer'

const { t } = useI18n()
const viewer = useViewerStore()
const settings = useSettingsStore()
</script>

<template>
  <div class="row actions">
    <button class="chip" type="button" @click="viewer.setAllSystems(true)">{{ t('layers.showAll') }}</button>
    <button class="chip" type="button" @click="viewer.setAllSystems(false)">{{ t('layers.hideAll') }}</button>
    <label class="dim">
      <input v-model="viewer.dimOthers" type="checkbox" />
      {{ t('layers.dim') }}
    </label>
  </div>

  <ul class="systems">
    <li v-for="s in SYSTEMS" :key="s.id" class="system">
      <label class="toggle">
        <input
          type="checkbox"
          :checked="viewer.visibleSystems.includes(s.id)"
          @change="viewer.toggleSystem(s.id)"
        />
        <span class="swatch" :style="{ background: '#' + s.color.toString(16).padStart(6, '0') }" />
        <span>{{ settings.locale === 'zh' ? s.names.zh : s.names.en }}</span>
      </label>
      <input
        class="opacity"
        type="range"
        min="0.1"
        max="1"
        step="0.05"
        :aria-label="t('layers.opacity')"
        :value="viewer.systemOpacity[s.id] ?? 1"
        @input="viewer.setOpacity(s.id, Number(($event.target as HTMLInputElement).value))"
      />
    </li>
  </ul>

  <div class="row">
    <span>{{ t('layers.sex') }}</span>
    <button class="chip" type="button" :aria-pressed="viewer.sex === 'female'" :class="{ on: viewer.sex === 'female' }" @click="viewer.sex = 'female'">
      {{ t('layers.female') }}
    </button>
    <button class="chip" type="button" :aria-pressed="viewer.sex === 'male'" :class="{ on: viewer.sex === 'male' }" @click="viewer.sex = 'male'">
      {{ t('layers.male') }}
    </button>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0;
}
.dim {
  font-size: 13px;
  color: var(--text-muted);
}
.systems {
  list-style: none;
  margin: 0;
  padding: 0;
}
.system {
  display: grid;
  grid-template-columns: 1fr 110px;
  align-items: center;
  gap: 12px;
  min-height: 44px;
}
.toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}
.swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid #0003;
}
.opacity {
  width: 100%;
}
.chip.on {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
</style>
