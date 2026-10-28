<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useViewerStore } from '@/stores/viewer'
import type { ClipAxis } from '@/viewer/types'

const { t } = useI18n()
const viewer = useViewerStore()

const AXES: ClipAxis[] = ['sagittal', 'coronal', 'transverse']
// Slider range in metres per axis, wide enough to pass through the whole body.
const RANGES: Record<ClipAxis, [number, number]> = {
  sagittal: [-0.3, 0.3],
  coronal: [-0.15, 0.15],
  transverse: [0, 1.85],
}
const range = computed(() => RANGES[viewer.clip.axis])
</script>

<template>
  <label class="row">
    <input
      type="checkbox"
      :checked="viewer.clip.enabled"
      @change="viewer.setClip({ enabled: ($event.target as HTMLInputElement).checked })"
    />
    {{ t('clip.enable') }}
  </label>

  <div class="row" role="group" :aria-label="t('clip.title')">
    <button
      v-for="axis in AXES"
      :key="axis"
      class="chip"
      type="button"
      :class="{ on: viewer.clip.axis === axis }"
      :aria-pressed="viewer.clip.axis === axis"
      @click="viewer.setClip({ axis })"
    >
      {{ t(`clip.${axis}`) }}
    </button>
  </div>

  <label class="row">
    <span>{{ t('clip.position') }}</span>
    <input
      class="slider"
      type="range"
      step="0.01"
      :min="range[0]"
      :max="range[1]"
      :value="viewer.clip.position"
      :disabled="!viewer.clip.enabled"
      @input="viewer.setClip({ position: Number(($event.target as HTMLInputElement).value) })"
    />
  </label>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
}
.slider {
  flex: 1;
}
.chip.on {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
</style>
