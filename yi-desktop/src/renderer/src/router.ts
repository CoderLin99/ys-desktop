import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * 路由懒加载：首屏只拉当前页，避免 Cursor 内置浏览器一次编译全部视图。
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./views/HomeView.vue')
    },
    {
      path: '/hehun',
      name: 'hehun',
      component: () => import('./views/HeHunView.vue')
    },
    {
      path: '/daily',
      name: 'daily',
      component: () => import('./views/DailyFortuneView.vue')
    },
    {
      path: '/trend',
      name: 'trend',
      component: () => import('./views/TrendView.vue')
    },
    {
      path: '/bazi',
      name: 'bazi',
      component: () => import('./views/BaZiView.vue')
    },
    {
      path: '/liuyao',
      name: 'liuyao',
      component: () => import('./views/LiuYaoView.vue')
    },
    {
      path: '/ziwei',
      name: 'ziwei',
      component: () => import('./views/ZiWeiView.vue')
    },
    {
      path: '/fengshui',
      name: 'fengshui',
      component: () => import('./views/FengShuiView.vue')
    },
    {
      path: '/huangli',
      name: 'huangli',
      component: () => import('./views/HuangliView.vue')
    },
    {
      path: '/rules',
      name: 'rules',
      component: () => import('./views/RulesView.vue')
    },
    {
      path: '/ai-settings',
      name: 'ai-settings',
      component: () => import('./views/AiSettingsView.vue')
    }
  ]
})

export default router
