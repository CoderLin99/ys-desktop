<script setup lang="ts">
/**
 * 应用壳：桌面侧栏；手机端顶栏 + 主区 + 底部 Tab（非照搬 PC）。
 */
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShellStore } from './stores/shell'
import { useThemeStore } from './stores/theme'
import { useAuthStore } from './stores/auth'
import { isCloudMembershipMode, isSupabaseConfigured } from './lib/cloudConfig'
import ThemeToggle from './components/ThemeToggle.vue'
import MingAssistantHost from './components/MingAssistantHost.vue'
/** 侧栏品牌图标（与安装包 / 窗口图标同源） */
import appIcon from './assets/app-icon.png'

const route = useRoute()
const router = useRouter()
const shell = useShellStore()
const theme = useThemeStore()
const auth = useAuthStore()
const { moreOpen } = storeToRefs(shell)
const { isLoggedIn, isAdmin } = storeToRefs(auth)

/** 单条导航 */
interface NavLeaf {
  /** 展示名 */
  label: string
  /** 路由 path */
  to: string
  /** route.name 匹配 */
  match: string
  /** 简写字标（菜单左侧印章感） */
  mark: string
}

/** 分组导航（桌面侧栏） */
interface NavGroup {
  /** 分组标题 */
  label: string
  /** 子项 */
  items: NavLeaf[]
}

/** 是否使用精简布局（登录 / 管理端） */
const minimalLayout = computed(() => {
  const layout = route.meta.layout
  return layout === 'auth' || layout === 'admin'
})

/** 系统导航：Web 会员模式隐藏本地 Key 配置 */
const systemNavItems = computed((): NavLeaf[] => {
  const items: NavLeaf[] = []
  if (isSupabaseConfigured()) {
    items.push({
      to: isLoggedIn.value ? '/member' : '/login',
      label: isLoggedIn.value ? '会员' : '登录',
      match: isLoggedIn.value ? 'member' : 'login',
      mark: '员'
    })
  }
  if (isAdmin.value) {
    items.push({ to: '/admin', label: '管理', match: 'admin-orders', mark: '管' })
  }
  if (!isCloudMembershipMode()) {
    items.push({ to: '/ai-settings', label: '大模型', match: 'ai-settings', mark: '模' })
  }
  return items
})

/** 主导航：分组 + 字标，贴合易学气质 */
const navGroups = computed((): NavGroup[] => [
  {
    label: '起盘',
    items: [
      { to: '/', label: '首页', match: 'home', mark: '首' },
      { to: '/daily', label: '日运', match: 'daily', mark: '日' },
      { to: '/bazi', label: '八字', match: 'bazi', mark: '八' },
      { to: '/ziwei', label: '紫微', match: 'ziwei', mark: '紫' },
      { to: '/fengshui', label: '风水', match: 'fengshui', mark: '风' },
      { to: '/hehun', label: '合盘', match: 'hehun', mark: '合' },
      { to: '/trend', label: '走势', match: 'trend', mark: '势' },
      { to: '/liuyao', label: '六爻', match: 'liuyao', mark: '爻' }
    ]
  },
  {
    label: '历法 · 学堂',
    items: [
      { to: '/huangli', label: '黄历', match: 'huangli', mark: '历' },
      { to: '/rules', label: '学堂', match: 'rules', mark: '学' }
    ]
  },
  {
    label: '系统',
    items: systemNavItems.value
  }
])

/** 手机底部主 Tab（高频入口，最多 5 个含「更多」） */
const primaryTabs: NavLeaf[] = [
  { to: '/', label: '首页', match: 'home', mark: '首' },
  { to: '/bazi', label: '八字', match: 'bazi', mark: '八' },
  { to: '/daily', label: '日运', match: 'daily', mark: '日' },
  { to: '/rules', label: '学堂', match: 'rules', mark: '学' }
]

/** 「更多」面板内的次要入口 */
const moreItems = computed((): NavLeaf[] => {
  const base: NavLeaf[] = [
    { to: '/huangli', label: '黄历', match: 'huangli', mark: '历' },
    { to: '/ziwei', label: '紫微', match: 'ziwei', mark: '紫' },
    { to: '/fengshui', label: '风水', match: 'fengshui', mark: '风' },
    { to: '/hehun', label: '合盘', match: 'hehun', mark: '合' },
    { to: '/trend', label: '走势', match: 'trend', mark: '势' },
    { to: '/liuyao', label: '六爻', match: 'liuyao', mark: '爻' }
  ]
  if (isSupabaseConfigured()) {
    base.push({
      to: isLoggedIn.value ? '/member' : '/login',
      label: isLoggedIn.value ? '会员' : '登录',
      match: isLoggedIn.value ? 'member' : 'login',
      mark: '员'
    })
  }
  if (!isCloudMembershipMode()) {
    base.push({ to: '/ai-settings', label: '大模型', match: 'ai-settings', mark: '模' })
  }
  return base
})

/** 扁平列表：顶栏标题 */
const flatNav = computed(() => navGroups.value.flatMap((g) => g.items))

/** 是否显示回顶按钮 */
const showTop = ref(false)
/** 主滚动容器 */
let mainEl: HTMLElement | null = null

/** 当前页标题（窄屏顶栏） */
const pageTitle = computed(() => flatNav.value.find((n) => n.match === route.name)?.label ?? '易学桌面')

/** 当前是否落在「更多」里的路由 */
const isMoreRoute = computed(() => moreItems.value.some((n) => n.match === route.name))

/**
 * 监听主区滚动，超过阈值显示回顶。
 */
function onMainScroll(): void {
  const top = mainEl?.scrollTop ?? window.scrollY
  showTop.value = top > 240
}

/**
 * 平滑滚动回主区顶部。
 */
function scrollToTop(): void {
  if (mainEl) {
    mainEl.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

/**
 * 点主 Tab：关「更多」并跳转。
 * @param to 目标 path
 */
function goPrimary(to: string): void {
  shell.closeMore()
  if (route.path !== to) void router.push(to)
}

/**
 * 点「更多」Tab：切换底部面板。
 */
function onMoreTab(): void {
  shell.toggleMore()
}

/**
 * 「更多」内跳转后关闭面板。
 */
function onMoreGo(): void {
  shell.closeMore()
}

/** 路由切换时滚回顶并关更多（避免叠层残留） */
watch(
  () => route.fullPath,
  () => {
    shell.closeMore()
    if (mainEl) mainEl.scrollTop = 0
  }
)

onMounted(() => {
  theme.hydrate()
  mainEl = document.querySelector('.main')
  mainEl?.addEventListener('scroll', onMainScroll, { passive: true })
  onMainScroll()
})

onBeforeUnmount(() => {
  mainEl?.removeEventListener('scroll', onMainScroll)
})
</script>

<template>
  <div v-if="minimalLayout" class="minimal-shell">
    <router-view />
  </div>
  <div v-else class="shell" :class="{ 'more-open': moreOpen }">
    <!-- 手机顶栏：标题 + 主题，无汉堡（导航改底部 Tab） -->
    <header class="topbar">
      <img class="topbar-mark" :src="appIcon" width="28" height="28" alt="" />
      <span class="topbar-title">{{ pageTitle }}</span>
      <ThemeToggle class="topbar-theme" />
    </header>

    <!-- 桌面侧栏 -->
    <aside class="side desktop-side">
      <div class="brand">
        <img class="brand-mark" :src="appIcon" width="44" height="44" alt="易学桌面" />
        <div class="brand-copy">
          <p class="brand-name">易学桌面</p>
          <p class="brand-sub">八字 · 六爻</p>
        </div>
        <ThemeToggle />
      </div>

      <nav class="side-nav" aria-label="主导航">
        <section v-for="g in navGroups" :key="g.label" class="nav-group">
          <p class="nav-group-title">{{ g.label }}</p>
          <router-link
            v-for="item in g.items"
            :key="item.to"
            :to="item.to"
            class="nav-link"
            :class="{ active: route.name === item.match }"
          >
            <span class="nav-seal" aria-hidden="true">{{ item.mark }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </router-link>
        </section>
      </nav>

      <p class="side-foot">子平命理总断 · 岁运须逐年参详</p>
    </aside>

    <main class="main">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>

    <!-- 手机底部 Tab -->
    <nav class="tab-bar" aria-label="底部导航">
      <button
        v-for="tab in primaryTabs"
        :key="tab.to"
        type="button"
        class="tab-item"
        :class="{ active: !moreOpen && route.name === tab.match }"
        @click="goPrimary(tab.to)"
      >
        <span class="tab-seal" aria-hidden="true">{{ tab.mark }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
      <button
        type="button"
        class="tab-item"
        :class="{ active: moreOpen || isMoreRoute }"
        aria-haspopup="dialog"
        :aria-expanded="moreOpen"
        @click="onMoreTab"
      >
        <span class="tab-seal more-seal" aria-hidden="true">···</span>
        <span class="tab-label">更多</span>
      </button>
    </nav>

    <!-- 「更多」底部面板 -->
    <div v-show="moreOpen" class="more-scrim" @click="shell.closeMore" />
    <aside v-show="moreOpen" class="more-sheet" role="dialog" aria-label="更多功能" aria-modal="true">
      <div class="more-handle" aria-hidden="true" />
      <p class="more-title">更多功能</p>
      <div class="more-grid">
        <router-link
          v-for="item in moreItems"
          :key="'m' + item.to"
          :to="item.to"
          class="more-card"
          :class="{ active: route.name === item.match }"
          @click="onMoreGo"
        >
          <span class="more-seal" aria-hidden="true">{{ item.mark }}</span>
          <span class="more-label">{{ item.label }}</span>
        </router-link>
      </div>
    </aside>

    <button
      v-show="showTop"
      type="button"
      class="back-top"
      title="回到顶部"
      aria-label="回到顶部"
      @click="scrollToTop"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 19V6M6.5 11.5 12 6l5.5 5.5"
        />
      </svg>
      <span>顶部</span>
    </button>
    <MingAssistantHost />
  </div>
</template>

<style scoped>
.minimal-shell {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--paper);
}
.shell {
  display: grid;
  grid-template-columns: 228px 1fr;
  min-height: 100vh;
  min-height: 100dvh;
}

.topbar {
  display: none;
}

.tab-bar,
.more-scrim,
.more-sheet {
  display: none;
}

.side {
  position: relative;
  z-index: 2;
  padding: 20px 12px 16px;
  border-right: 1px solid var(--line);
  background:
    radial-gradient(ellipse 120% 40% at 0% 0%, color-mix(in srgb, var(--teal) 14%, transparent), transparent 55%),
    radial-gradient(ellipse 80% 30% at 100% 100%, color-mix(in srgb, var(--seal) 8%, transparent), transparent 50%),
    var(--surface-solid);
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: auto;
}

.brand {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 6px 8px 14px;
  border-bottom: 1px solid var(--line);
  animation: rise-in 0.55s ease both;
}
.brand-copy {
  flex: 1;
  min-width: 0;
}
.brand-mark {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  object-fit: cover;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--gold) 40%, transparent),
    0 6px 14px color-mix(in srgb, var(--ink) 12%, transparent);
  flex-shrink: 0;
}
.brand-name {
  margin: 0;
  font-family: var(--font-brand);
  font-size: 1.38rem;
  letter-spacing: 0.1em;
  line-height: 1.1;
  color: var(--ink);
}
.brand-sub {
  margin: 3px 0 0;
  font-size: 0.7rem;
  color: var(--ink-soft);
  letter-spacing: 0.2em;
}

.side-nav {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  min-height: 0;
}
.nav-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.nav-group-title {
  margin: 0 10px 6px;
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  color: var(--muted);
  text-transform: none;
}

.nav-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 12px;
  border-radius: 12px;
  color: var(--ink-soft);
  text-decoration: none;
  min-height: var(--touch-min);
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}
.nav-link:hover {
  background: color-mix(in srgb, var(--teal) 10%, transparent);
  color: var(--ink);
}
.nav-link.active {
  background: linear-gradient(
    105deg,
    color-mix(in srgb, var(--teal) 22%, var(--surface-solid)),
    color-mix(in srgb, var(--teal) 8%, var(--surface-solid))
  );
  color: var(--ink);
  box-shadow: inset 3px 0 0 var(--teal);
  font-weight: 600;
}
.nav-link.active .nav-seal {
  background: var(--teal);
  color: var(--on-accent);
  border-color: transparent;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--teal) 35%, transparent);
}
.nav-seal {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--surface-strong) 80%, transparent);
  font-family: var(--font-display);
  font-size: 0.78rem;
  letter-spacing: 0;
  color: var(--teal);
  transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}
.nav-label {
  font-size: 0.95rem;
  letter-spacing: 0.06em;
}

.side-foot {
  margin-top: auto;
  padding: 12px 10px 2px;
  border-top: 1px solid var(--line);
  font-size: 0.68rem;
  color: var(--ink-soft);
  line-height: 1.55;
  letter-spacing: 0.04em;
}

.main {
  padding: 28px 36px 40px;
  overflow: auto;
  max-height: 100vh;
  max-height: 100dvh;
  scroll-behavior: smooth;
  min-width: 0;
}

.back-top {
  position: fixed;
  right: 22px;
  bottom: calc(var(--dock-back-top-bottom) + env(safe-area-inset-bottom, 0px));
  z-index: 40;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface-solid);
  color: var(--ink);
  box-shadow: var(--shadow);
  cursor: pointer;
  font-size: 0.82rem;
  letter-spacing: 0.06em;
}
.back-top:hover {
  background: var(--ink);
  color: var(--on-accent);
  border-color: var(--ink);
}

/* ========== 手机壳：顶栏 + 主区 + 底 Tab ========== */
@media (max-width: 860px) {
  .shell {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr) auto;
    height: 100vh;
    height: 100dvh;
    max-width: 100vw;
    overflow: hidden;
    padding-top: env(safe-area-inset-top, 0px);
  }
  .desktop-side {
    display: none;
  }

  .topbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    padding-left: max(12px, env(safe-area-inset-left, 0px));
    padding-right: max(12px, env(safe-area-inset-right, 0px));
    border-bottom: 1px solid var(--line);
    /* 平板上勿半透明叠菜单，否则主题钮点不着、暗夜像失效 */
    background: var(--surface-solid);
    position: relative;
    z-index: 80;
    flex-shrink: 0;
    min-height: var(--topbar-height, 48px);
    isolation: isolate;
    /* 允许主题下拉溢出顶栏，不被裁切 */
    overflow: visible;
  }
  .topbar-mark {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--gold) 35%, transparent);
  }
  .topbar-title {
    font-family: var(--font-brand);
    letter-spacing: 0.12em;
    font-size: 1.02rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .topbar-theme {
    margin-left: auto;
    flex-shrink: 0;
  }

  .main {
    min-height: 0;
    max-height: none;
    overflow: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    padding: 12px 12px 16px;
    padding-left: max(12px, env(safe-area-inset-left, 0px));
    padding-right: max(12px, env(safe-area-inset-right, 0px));
    /* Tab + 内容底边距；各页 .page 再叠 FAB 避让，勿再加一份 tab */
    padding-bottom: calc(12px + var(--tab-bar-height) + env(safe-area-inset-bottom, 0px));
  }

  .tab-bar {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    height: calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px));
    padding: 4px 4px calc(4px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--line);
    background: color-mix(in srgb, var(--surface-solid) 94%, transparent);
    backdrop-filter: blur(14px);
    box-shadow: 0 -8px 24px color-mix(in srgb, var(--ink) 8%, transparent);
  }
  .tab-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    margin: 0;
    padding: 4px 2px;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: var(--ink-soft);
    cursor: pointer;
    font: inherit;
    min-width: 0;
    min-height: 0;
    -webkit-tap-highlight-color: transparent;
  }
  .tab-item.active {
    color: var(--teal);
  }
  .tab-item.active .tab-seal {
    background: var(--teal);
    color: var(--on-accent);
    border-color: transparent;
    transform: translateY(-1px);
  }
  .tab-seal {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    border: 1px solid var(--line);
    background: color-mix(in srgb, var(--surface-strong) 85%, transparent);
    font-family: var(--font-display);
    font-size: 0.78rem;
    color: var(--teal);
    transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
  }
  .tab-seal.more-seal {
    font-size: 0.95rem;
    letter-spacing: 0.05em;
    font-family: var(--font-ui);
    font-weight: 700;
  }
  .tab-label {
    font-size: 0.68rem;
    letter-spacing: 0.06em;
    line-height: 1.2;
    white-space: nowrap;
  }

  .more-scrim {
    display: block;
    position: fixed;
    inset: 0;
    /* 高于助手 FAB，低于助手抽屉与顶栏 */
    z-index: 58;
    background: color-mix(in srgb, var(--ink) 35%, transparent);
  }
  .more-sheet {
    display: block;
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px));
    z-index: 59;
    max-height: min(58dvh, 420px);
    overflow: auto;
    padding: 10px 14px 18px;
    border-radius: 18px 18px 0 0;
    border: 1px solid var(--line);
    border-bottom: none;
    background: var(--surface-solid);
    box-shadow: 0 -12px 36px color-mix(in srgb, var(--ink) 16%, transparent);
    animation: sheet-up 0.22s ease both;
  }
  .more-handle {
    width: 36px;
    height: 4px;
    margin: 0 auto 12px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ink) 18%, transparent);
  }
  .more-title {
    margin: 0 0 12px;
    font-family: var(--font-display);
    font-size: 0.95rem;
    letter-spacing: 0.12em;
    color: var(--ink-soft);
    text-align: center;
  }
  .more-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }
  .more-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 6px;
    border-radius: 14px;
    border: 1px solid var(--line);
    background: color-mix(in srgb, var(--surface-strong) 80%, transparent);
    text-decoration: none;
    color: var(--ink);
    min-height: var(--touch-min);
  }
  .more-card.active {
    border-color: color-mix(in srgb, var(--teal) 45%, var(--line));
    background: color-mix(in srgb, var(--teal) 14%, var(--surface-solid));
  }
  .more-seal {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: color-mix(in srgb, var(--teal) 16%, transparent);
    color: var(--teal);
    font-family: var(--font-display);
    font-size: 0.92rem;
  }
  .more-card.active .more-seal {
    background: var(--teal);
    color: var(--on-accent);
  }
  .more-label {
    font-size: 0.78rem;
    letter-spacing: 0.06em;
  }

  .back-top {
    right: max(12px, env(safe-area-inset-right, 0px));
    bottom: calc(var(--dock-back-top-bottom) + env(safe-area-inset-bottom, 0px));
    min-height: 40px;
    padding: 8px 12px;
  }
}

@media (max-width: 420px) {
  .more-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@keyframes sheet-up {
  from {
    transform: translateY(12px);
    opacity: 0.6;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
