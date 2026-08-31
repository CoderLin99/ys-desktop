import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import App from './App.vue'
import router from './router'
import { installTauriDesktopBridge } from './tauriBridge'
import { hydrateThemeEarly } from './stores/theme'
/** 全局中文 locale：黄历 DatePicker 月份/星期/Today 等 */
import { primeVueZhCN } from './locales/primevue-zh-CN'
import './styles/main.css'
import './styles/assistant.css'

/** 尽早套上本机主题，避免首屏闪一下 */
hydrateThemeEarly()

/**
 * 先挂 Tauri 桥再挂 Vue，保证排盘页一启动就能走 Rust HTTP 代理。
 */
async function bootstrap(): Promise<void> {
  await installTauriDesktopBridge()
  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.use(PrimeVue, {
    /** 注入 zh-CN，避免日历等组件残留英文文案 */
    locale: primeVueZhCN,
    theme: {
      preset: Aura,
      options: {
        darkModeSelector: 'html[data-theme="dark"]',
        cssLayer: {
          name: 'primevue',
          order: 'primevue'
        }
      }
    }
  })
  app.mount('#app')
}

void bootstrap()
