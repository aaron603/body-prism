import { createRouter, createWebHashHistory } from 'vue-router'

// Hash history keeps the app deployable on any static host and works offline in the PWA.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: () => import('@/views/Explore.vue') },
    { path: '/quiz', component: () => import('@/views/Quiz.vue') },
    { path: '/about', component: () => import('@/views/About.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
