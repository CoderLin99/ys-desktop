import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { isCloudMembershipMode, isSupabaseConfigured } from './lib/cloudConfig'
import { isTauriRuntime } from './tauriBridge'

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
      component: () => import('./views/AiSettingsView.vue'),
      meta: { requiresLocalAi: true }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('./views/auth/LoginView.vue'),
      meta: { layout: 'auth' }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('./views/auth/RegisterView.vue'),
      meta: { layout: 'auth' }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('./views/auth/ForgotPasswordView.vue'),
      meta: { layout: 'auth' }
    },
    {
      path: '/member',
      name: 'member',
      component: () => import('./views/MemberView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      component: () => import('./views/admin/AdminLayout.vue'),
      meta: { layout: 'admin', requiresAuth: true, requiresAdmin: true },
      children: [
        { path: '', redirect: '/admin/orders' },
        {
          path: 'orders',
          name: 'admin-orders',
          component: () => import('./views/admin/AdminOrdersView.vue')
        },
        {
          path: 'members',
          name: 'admin-members',
          component: () => import('./views/admin/AdminMembersView.vue')
        },
        {
          path: 'models',
          name: 'admin-models',
          component: () => import('./views/admin/AdminModelsView.vue')
        }
      ]
    }
  ]
})

/**
 * 全局导航守卫：登录 / 管理端 / Web 版隐藏本地 Key 配置。
 */
router.beforeEach(async (to) => {
  if (isSupabaseConfigured()) {
    const auth = useAuthStore()
    if (!auth.initialized) await auth.init()
    if (to.meta.requiresAuth && !auth.isLoggedIn) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (to.meta.requiresAdmin && !auth.isAdmin) {
      return { name: 'member' }
    }
  }

  if (to.meta.requiresLocalAi && isCloudMembershipMode() && !isTauriRuntime()) {
    return { name: 'member' }
  }

  return true
})

export default router
