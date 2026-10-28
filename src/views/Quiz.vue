<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useViewer } from '@/composables/useViewer'
import { displayName, structureById, structures, SYSTEMS } from '@/content'
import type { SystemId } from '@/content/schema'
import { generateQuiz, isCorrect, type Question } from '@/quiz/generate'
import { loadBestScore, loadWrongIds, recordResult, saveBestScore } from '@/quiz/storage'
import { useSettingsStore } from '@/stores/settings'
import { defaultViewState } from '@/viewer/types'

const { t } = useI18n()
const router = useRouter()
const settings = useSettingsStore()

type Phase = 'setup' | 'playing' | 'done'
const phase = ref<Phase>('setup')
const system = ref<SystemId | ''>('')
const count = ref(10)
const questions = ref<Question[]>([])
const index = ref(0)
const answer = ref<{ id: string | null } | null>(null)
const score = ref(0)
const correctIds = ref<string[]>([])
const wrongIds = ref<string[]>([])
const wrongBook = ref<string[]>([])
const best = ref(0)

const stage = ref<HTMLElement | null>(null)
const current = computed(() => questions.value[index.value])
const target = computed(() => (current.value ? structureById.get(current.value.targetId) : undefined))
const modelIds = new Set(structures.map((s) => s.id))
const showStage = computed(
  () => phase.value === 'playing' && current.value !== undefined && current.value.type !== 'translate',
)

const { viewer } = useViewer(stage, (id) => {
  if (phase.value === 'playing' && current.value?.type === 'pick' && !answer.value && id) submit(id)
})

onMounted(async () => {
  best.value = await loadBestScore()
  wrongBook.value = await loadWrongIds()
})

function start(onlyIds?: string[]): void {
  questions.value = generateQuiz(structures, {
    count: count.value,
    system: system.value || undefined,
    onlyIds,
    modelIds,
  })
  if (!questions.value.length) return
  index.value = 0
  score.value = 0
  correctIds.value = []
  wrongIds.value = []
  answer.value = null
  phase.value = 'playing'
}

function submit(id: string | null): void {
  if (answer.value || !current.value) return
  answer.value = { id }
  if (isCorrect(current.value, id)) {
    score.value++
    correctIds.value.push(current.value.targetId)
  } else {
    wrongIds.value.push(current.value.targetId)
  }
}

async function next(): Promise<void> {
  if (index.value + 1 < questions.value.length) {
    index.value++
    answer.value = null
    return
  }
  phase.value = 'done'
  best.value = await saveBestScore(score.value)
  wrongBook.value = await recordResult(correctIds.value, wrongIds.value)
}

// Pick questions show only the target's system; the 3D scene reveals the answer afterwards.
watch(
  [viewer, current, answer, phase],
  ([v, q, a]) => {
    if (!v || !q || !target.value || phase.value !== 'playing') return
    const reveal = q.type === 'identify' || a !== null
    v.setState({
      ...defaultViewState(),
      visibleSystems: new Set([target.value.system]),
      selectedId: reveal ? q.targetId : null,
      sex: target.value.sex ?? 'male',
    })
    if (q.type === 'identify') v.focusOn(q.targetId)
    else v.setPreset('front')
  },
  { flush: 'post' },
)

const name = (id: string): string => {
  const s = structureById.get(id)
  return s ? displayName(s, settings.locale) : id
}
</script>

<template>
  <main class="quiz">
    <header class="bar">
      <button class="btn" type="button" @click="router.push('/')">{{ t('quiz.back') }}</button>
      <strong>{{ t('quiz.title') }}</strong>
      <button class="btn" type="button" @click="settings.toggleLocale()">{{ t('toolbar.language') }}</button>
    </header>

    <section v-if="phase === 'setup'" class="page card">
      <p>{{ t('quiz.best') }}: {{ best }}</p>
      <label class="field">
        {{ t('quiz.systemFilter') }}
        <select v-model="system">
          <option value="">{{ t('quiz.modeAll') }}</option>
          <option v-for="s in SYSTEMS.filter((x) => x.id !== 'integumentary')" :key="s.id" :value="s.id">
            {{ settings.locale === 'zh' ? s.names.zh : s.names.en }}
          </option>
        </select>
      </label>
      <label class="field">
        {{ t('quiz.questions') }}
        <select v-model.number="count">
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="20">20</option>
        </select>
      </label>
      <button class="btn primary" type="button" @click="start()">{{ t('quiz.start') }}</button>
      <p>{{ wrongBook.length ? t('quiz.wrongCount', { n: wrongBook.length }) : t('quiz.noWrong') }}</p>
      <button v-if="wrongBook.length" class="btn" type="button" @click="start(wrongBook)">
        {{ t('quiz.practiceWrong') }}
      </button>
    </section>

    <section v-show="phase === 'playing'" class="play">
      <div v-show="showStage" ref="stage" class="stage" />
      <div v-if="current" class="card">
        <p class="progress">{{ t('quiz.progress', { i: index + 1, n: questions.length }) }}</p>
        <p v-if="current.type === 'pick'" class="prompt">{{ t('quiz.pickPrompt') }} <strong>{{ name(current.targetId) }}</strong></p>
        <p v-else-if="current.type === 'identify'" class="prompt">{{ t('quiz.identifyPrompt') }}</p>
        <p v-else class="prompt">{{ t('quiz.translatePrompt') }} <strong>{{ target?.names.la }}</strong></p>

        <div v-if="current.choiceIds.length" class="choices">
          <button
            v-for="id in current.choiceIds"
            :key="id"
            class="btn"
            type="button"
            :class="{ right: answer && id === current.targetId, bad: answer?.id === id && id !== current.targetId }"
            :disabled="answer !== null"
            @click="submit(id)"
          >
            {{ name(id) }}
          </button>
        </div>

        <template v-if="answer">
          <p class="verdict" role="status">
            {{ isCorrect(current, answer.id) ? t('quiz.correct') : t('quiz.wrong') + name(current.targetId) }}
          </p>
          <button class="btn primary" type="button" @click="next">
            {{ index + 1 < questions.length ? t('quiz.next') : t('quiz.finish') }}
          </button>
        </template>
      </div>
    </section>

    <section v-if="phase === 'done'" class="page card">
      <h1>{{ t('quiz.result', { score, n: questions.length }) }}</h1>
      <p>{{ t('quiz.best') }}: {{ best }}</p>
      <button class="btn primary" type="button" @click="phase = 'setup'">{{ t('quiz.again') }}</button>
    </section>
  </main>
</template>

<style scoped>
.quiz {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--surface-solid);
  color: var(--text);
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(8px + var(--safe-top)) 12px 8px;
}
.play {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}
.stage {
  flex: none;
  height: 42vh;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px calc(16px + var(--safe-bottom));
}
.choices {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.progress {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}
.prompt {
  margin: 0;
  font-size: 16px;
}
.verdict {
  margin: 0;
  font-weight: 600;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
select {
  min-height: 44px;
  font-size: 16px;
}
.btn.right {
  border-color: #16a34a;
  background: #16a34a22;
}
.btn.bad {
  border-color: #dc2626;
  background: #dc262622;
}
</style>
