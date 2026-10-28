<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import BottomPanel from '@/components/BottomPanel.vue'
import ClipPanel from '@/components/ClipPanel.vue'
import InfoSheet from '@/components/InfoSheet.vue'
import LayerPanel from '@/components/LayerPanel.vue'
import { useViewer } from '@/composables/useViewer'
import { displayName, structures } from '@/content'
import { createSearchIndex } from '@/search'
import { useSettingsStore } from '@/stores/settings'
import { useViewerStore } from '@/stores/viewer'
import type { ViewPreset } from '@/viewer/types'

const { t } = useI18n()
const router = useRouter()
const store = useViewerStore()
const settings = useSettingsStore()
const searchIndex = createSearchIndex(structures)

const stage = ref<HTMLElement | null>(null)
const query = ref('')
const results = computed(() => searchIndex.search(query.value, 12))

const { viewer, webglOk } = useViewer(stage, (id) => store.select(id))

watch(
  [viewer, () => store.viewState],
  ([v, state]) => v?.setState(state),
  { immediate: true, deep: false },
)

const labelText = computed(() =>
  store.selected ? displayName(store.selected, settings.locale) : null,
)
watch([viewer, labelText], ([v, text]) => v?.setLabelText(text), { immediate: true })

watch(
  () => store.focusTick,
  () => {
    if (store.selectedId) viewer.value?.focusOn(store.selectedId)
  },
)

function chooseResult(id: string): void {
  store.select(id, { focus: true })
  query.value = ''
}

const PRESETS: ViewPreset[] = ['front', 'back', 'left', 'right', 'top']

function reset(): void {
  store.resetView()
  viewer.value?.setPreset('front')
}
</script>

<template>
  <div class="explore">
    <div ref="stage" class="stage">
      <p v-if="!webglOk" class="nowebgl" role="alert">{{ t('viewer.noWebgl') }}</p>

      <div class="top">
        <input
          v-model="query"
          class="search"
          type="search"
          :placeholder="t('search.placeholder')"
          :aria-label="t('search.placeholder')"
        />
        <ul v-if="query.trim()" class="results">
          <li v-if="!results.length" class="empty">{{ t('search.empty') }}</li>
          <li v-for="s in results" :key="s.id">
            <button type="button" @click="chooseResult(s.id)">
              <strong>{{ displayName(s, settings.locale) }}</strong>
              <span>{{ s.names.la }}</span>
            </button>
          </li>
        </ul>
      </div>

      <nav class="tools" :aria-label="t('app.title')">
        <button class="tool" type="button" @click="store.setPanel('layers')">{{ t('toolbar.layers') }}</button>
        <button class="tool" type="button" @click="store.setPanel('clip')">{{ t('toolbar.cut') }}</button>
        <button class="tool" type="button" @click="store.setPanel('view')">{{ t('toolbar.view') }}</button>
        <button class="tool" type="button" @click="reset">{{ t('toolbar.reset') }}</button>
        <button class="tool" type="button" @click="router.push('/quiz')">{{ t('toolbar.quiz') }}</button>
        <button class="tool" type="button" @click="settings.toggleLocale()">{{ t('toolbar.language') }}</button>
        <button class="tool" type="button" @click="router.push('/about')">{{ t('nav.about') }}</button>
      </nav>

      <p class="hint">{{ t('viewer.placeholder') }}</p>
    </div>

    <BottomPanel v-if="store.panel === 'info' && store.selected" :title="t('nav.explore')" @close="store.select(null)">
      <InfoSheet />
    </BottomPanel>
    <BottomPanel v-else-if="store.panel === 'layers'" :title="t('layers.title')" @close="store.setPanel('none')">
      <LayerPanel />
    </BottomPanel>
    <BottomPanel v-else-if="store.panel === 'clip'" :title="t('clip.title')" @close="store.setPanel('none')">
      <ClipPanel />
    </BottomPanel>
    <BottomPanel v-else-if="store.panel === 'view'" :title="t('toolbar.view')" @close="store.setPanel('none')">
      <div class="presets">
        <button v-for="p in PRESETS" :key="p" class="chip" type="button" @click="viewer?.setPreset(p)">
          {{ t(`view.${p}`) }}
        </button>
      </div>
    </BottomPanel>
  </div>
</template>

<style scoped>
.explore {
  display: flex;
  flex-direction: column;
  height: 100dvh;
}
.stage {
  flex: 1;
  min-height: 0;
}
.top {
  position: absolute;
  top: calc(8px + var(--safe-top));
  left: 8px;
  right: 64px;
  z-index: 10;
}
.search {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 0;
  border-radius: 22px;
  background: var(--surface);
  color: var(--text);
  font-size: 15px;
}
.results {
  list-style: none;
  margin: 6px 0 0;
  padding: 4px;
  max-height: 50vh;
  overflow-y: auto;
  border-radius: 12px;
  background: var(--surface-solid);
  color: var(--text);
}
.results button {
  display: flex;
  justify-content: space-between;
  width: 100%;
  min-height: 44px;
  align-items: center;
  padding: 0 10px;
  border: 0;
  background: none;
  text-align: left;
  cursor: pointer;
}
.results span,
.empty {
  color: var(--text-muted);
  font-size: 12px;
}
.empty {
  padding: 12px;
}
.tools {
  position: absolute;
  top: calc(8px + var(--safe-top));
  right: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 10;
}
.tool {
  width: 52px;
  min-height: 44px;
  border: 0;
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
}
.hint {
  position: absolute;
  left: 12px;
  bottom: 8px;
  right: 12px;
  margin: 0;
  font-size: 11px;
  color: #cbd5e1;
  pointer-events: none;
}
.nowebgl {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 24px;
  color: #fff;
  text-align: center;
}
.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
}
</style>
