<script setup lang="ts">
/**
 * 应用壳：侧栏导航 + 主内容区。
 */
import { useRoute } from 'vue-router'

const route = useRoute()

/** 主导航项 */
const nav = [
  { to: '/', label: '首页', match: 'home' },
  { to: '/bazi', label: '八字', match: 'bazi' },
  { to: '/liuyao', label: '六爻', match: 'liuyao' },
  { to: '/rules', label: '规则', match: 'rules' }
]
</script>

<template>
  <div class="shell">
    <aside class="side">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true" />
        <div>
          <p class="brand-name">易学桌面</p>
          <p class="brand-sub">八字 · 六爻</p>
        </div>
      </div>
      <nav>
        <router-link
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: route.name === item.match }"
        >
          {{ item.label }}
        </router-link>
      </nav>
      <p class="side-foot">教学归纳版 · 非迷信断言</p>
    </aside>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 100vh;
}

.side {
  position: relative;
  padding: 28px 20px;
  border-right: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.brand {
  display: flex;
  gap: 12px;
  align-items: center;
  animation: rise-in 0.6s ease both;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 30%, #f0d9a8, transparent 40%),
    conic-gradient(from 20deg, var(--teal), var(--ink), var(--seal), var(--teal));
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.35);
  animation: ink-pulse 6s ease-in-out infinite;
}

.brand-name {
  margin: 0;
  font-family: var(--font-brand);
  font-size: 1.55rem;
  letter-spacing: 0.08em;
  line-height: 1.1;
}

.brand-sub {
  margin: 2px 0 0;
  font-size: 0.78rem;
  color: var(--ink-soft);
  letter-spacing: 0.18em;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-item {
  padding: 10px 14px;
  border-radius: 8px;
  color: var(--ink-soft);
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.nav-item:hover {
  background: rgba(31, 111, 91, 0.08);
  color: var(--ink);
}

.nav-item.active {
  background: var(--ink);
  color: #f3f7f4;
  transform: translateX(2px);
}

.side-foot {
  margin-top: auto;
  font-size: 0.72rem;
  color: rgba(20, 35, 28, 0.55);
  line-height: 1.5;
}

.main {
  padding: 28px 32px 40px;
  overflow: auto;
}

@media (max-width: 860px) {
  .shell {
    grid-template-columns: 1fr;
  }
  .side {
    border-right: none;
    border-bottom: 1px solid var(--line);
  }
  nav {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
