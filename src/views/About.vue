<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
</script>

<template>
  <main class="page">
    <button class="btn" type="button" @click="router.push('/')">{{ t('quiz.back') }}</button>
    <h1>{{ t('about.title') }}</h1>
    <h2>{{ t('about.sources') }}</h2>
    <p>{{ t('about.sourcesBody') }}</p>
    <h2>{{ t('about.license') }}</h2>
    <p>{{ t('about.licenseBody') }}</p>
    <h2>{{ t('about.disclaimer') }}</h2>
    <p>{{ t('about.disclaimerBody') }}</p>
    <p>{{ t('about.terms') }}</p>
  </main>
</template>
