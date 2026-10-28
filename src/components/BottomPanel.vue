<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
</script>

<template>
  <section class="panel" role="dialog" :aria-label="title">
    <header class="panel-head">
      <h2>{{ title }}</h2>
      <button class="close" type="button" :aria-label="t('info.close')" @click="emit('close')">×</button>
    </header>
    <div class="panel-body"><slot /></div>
  </section>
</template>

<style scoped>
/* In normal flow so the stage above shrinks and the selection stays visible. */
.panel {
  flex: none;
  max-height: 46vh;
  display: flex;
  flex-direction: column;
  padding-bottom: var(--safe-bottom);
  background: var(--surface-solid);
  color: var(--text);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 20px #0006;
  z-index: 20;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px 4px;
}
.panel-head h2 {
  margin: 0;
  font-size: 16px;
}
.close {
  width: 44px;
  height: 44px;
  border: 0;
  background: none;
  font-size: 26px;
  cursor: pointer;
}
.panel-body {
  overflow-y: auto;
  padding: 0 16px 16px;
}
</style>
