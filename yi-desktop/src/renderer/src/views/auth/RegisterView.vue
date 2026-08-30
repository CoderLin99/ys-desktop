<script setup lang="ts">
/**
 * 邮箱注册页。
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()

/** 注册邮箱 */
const email = ref('')
/** 密码 */
const password = ref('')
/** 确认密码 */
const confirm = ref('')
/** 提交中 */
const loading = ref(false)
/** 错误 */
const err = ref('')
/** 成功提示 */
const ok = ref('')

/**
 * 提交注册。
 */
async function submit(): Promise<void> {
  err.value = ''
  ok.value = ''
  if (password.value.length < 6) {
    err.value = '密码至少 6 位'
    return
  }
  if (password.value !== confirm.value) {
    err.value = '两次密码不一致'
    return
  }
  loading.value = true
  try {
    await auth.register(email.value, password.value)
    ok.value = '注册成功！请查收验证邮件，点击链接后再登录。'
    setTimeout(() => void router.push('/login'), 2500)
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
      <h1>注册</h1>
      <p class="soft">使用邮箱注册；验证邮箱后可申请开通 AI 会员。</p>
      <form class="form" @submit.prevent="submit">
        <label>
          邮箱
          <input v-model="email" type="email" autocomplete="email" required />
        </label>
        <label>
          密码
          <input v-model="password" type="password" autocomplete="new-password" required minlength="6" />
        </label>
        <label>
          确认密码
          <input v-model="confirm" type="password" autocomplete="new-password" required minlength="6" />
        </label>
        <p v-if="err" class="err">{{ err }}</p>
        <p v-if="ok" class="ok">{{ ok }}</p>
        <button type="submit" class="primary" :disabled="loading">
          {{ loading ? '提交中…' : '注册' }}
        </button>
      </form>
      <p class="links">
        <router-link to="/login">已有账号？登录</router-link>
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
}
.soft {
  color: var(--ink-soft);
  font-size: 0.9rem;
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
  font-size: 16px;
}
.err {
  color: var(--seal);
  margin: 0;
}
.ok {
  color: var(--teal);
  margin: 0;
}
button.primary {
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: var(--teal);
  color: var(--on-accent);
  min-height: var(--touch-min);
  cursor: pointer;
}
.links {
  margin-top: 16px;
  text-align: center;
}
.links a {
  color: var(--teal);
  text-decoration: none;
}
</style>
