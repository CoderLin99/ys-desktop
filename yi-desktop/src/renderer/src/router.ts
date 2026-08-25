import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import BaZiView from './views/BaZiView.vue'
import LiuYaoView from './views/LiuYaoView.vue'
import TrendView from './views/TrendView.vue'
import RulesView from './views/RulesView.vue'

/** 哈希路由，适配 Electron file:// 协议 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/trend', name: 'trend', component: TrendView },
    { path: '/bazi', name: 'bazi', component: BaZiView },
    { path: '/liuyao', name: 'liuyao', component: LiuYaoView },
    { path: '/rules', name: 'rules', component: RulesView }
  ]
})

export default router
