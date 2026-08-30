<script setup lang="ts">
/**
 * 管理端壳：顶栏导航 + 子路由；仅 admin 角色可访问。
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { user, isAdmin } = storeToRefs(auth)

/** 管理菜单 */
const tabs = [
  { to: '/admin/orders', label: '订单审批', match: 'admin-orders' },
  { to: '/admin/members', label: '会员管理', match: 'admin-members' },
  { to: '/admin/models', label: '大模型', match: 'admin-models' }
]

const title = computed(() => tabs.find((t) => t.match === route.name)?.label ?? '管理后台')

async function logout(): Promise<void> {
  await auth.logout()
  await router.push('/login')
}
</script>

<template>
  <div class="admin-shell rise">
    <header class="admin-head">
      <div>
        <h1>管理后台</h1>
        <p class="sub">{{ title }} · {{ user?.email }}</p>
      </div>
      <div class="actions">
        <router-link to="/" class="ghost">返回 C 端</router-link>
        <button type="button" class="ghost" @click="logout">退出</button>
      </div>
    </header>

    <nav v-if="isAdmin" class="admin-nav">
      <router-link
        v-for="t in tabs"
        :key="t.to"
        :to="t.to"
        class="nav-tab"
        :class="{ active: route.name === t.match }"
      >
        {{ t.label }}
      </router-link>
    </nav>

    <main class="admin-main">
      <p v-if="!isAdmin" class="deny">当前账号无管理员权限。请在 Supabase 将 profiles.role 设为 admin。</p>
      <router-view v-else />
    </main>
  </div>
</template>

<style scoped>
.admin-shell {
  min-height: 100vh;
  padding: 20px 24px 40px;
  max-width: 1100px;
  margin: 0 auto;
}
.admin-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}
h1 {
  margin: 0;
  font-family: var(--font-brand);
  letter-spacing: 0.06em;
}
.sub {
  margin: 4px 0 0;
  color: var(--ink-soft);
  font-size: 0.88rem;
}
.actions {
  display: flex;
  gap: 8px;
}
.admin-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px 0;
}
.nav-tab {
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  text-decoration: none;
  color: var(--ink-soft);
  font-size: 0.9rem;
}
.nav-tab.active {
  background: color-mix(in srgb, var(--teal) 14%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--teal) 35%, var(--line));
  color: var(--teal);
  font-weight: 600;
}
.ghost {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  text-decoration: none;
  cursor: pointer;
  font-size: 0.88rem;
}
.deny {
  color: var(--seal);
  padding: 20px;
  border: 1px dashed var(--line);
  border-radius: 12px;
}
</style>
