<script setup lang="ts">
/**
 * 邮箱登录页。
 */
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

/** 表单邮箱 */
const email = ref('')
/** 表单密码 */
const password = ref('')
/** 提交中 */
const loading = ref(false)
/** 页内错误 */
const err = ref('')

/**
 * 提交登录。
 */
async function submit(): Promise<void> {
  err.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/member'
    await router.push(redirect)
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page rise">
    <div class="auth-card">
      <h1>登录</h1>
      <p class="soft">使用注册邮箱登录；AI 解答需有效会员。</p>
      <form class="form" @submit.prevent="submit">
        <label>
          邮箱
          <input v-model="email" type="email" autocomplete="email" required placeholder="you@example.com" />
        </label>
        <label>
          密码
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            minlength="6"
          />
        </label>
        <p v-if="err" class="err">{{ err }}</p>
        <button type="submit" class="primary" :disabled="loading">
          {{ loading ? '登录中…' : '登录' }}
        </button>
      </form>
      <p class="links">
        <router-link to="/register">注册账号</router-link>
        <span>·</span>
        <router-link to="/forgot-password">忘记密码</router-link>
        <span>·</span>
        <router-link to="/">返回首页</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 70vh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
}
.auth-card {
  width: min(420px, 100%);
  padding: 28px 24px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: var(--surface-solid);
  box-shadow: var(--shadow);
}
h1 {
  margin: 0 0 8px;
  font-family: var(--font-brand);
  letter-spacing: 0.08em;
}
.soft {
  color: var(--ink-soft);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 18px;
}
.form {
  display: grid;
  gap: 14px;
}
label {
  display: grid;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--input-bg);
  color: var(--ink);
  font-size: 16px;
}
.err {
  color: var(--seal);
  margin: 0;
  font-size: 0.88rem;
}
button.primary {
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: var(--teal);
  color: var(--on-accent);
  font-size: 1rem;
  cursor: pointer;
  min-height: var(--touch-min);
}
.links {
  margin: 16px 0 0;
  text-align: center;
  font-size: 0.88rem;
  color: var(--ink-soft);
}
.links a {
  color: var(--teal);
  text-decoration: none;
}
</style>
