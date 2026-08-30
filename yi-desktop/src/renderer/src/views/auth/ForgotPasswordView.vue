<script setup lang="ts">
/**
 * 忘记密码：发送 Supabase 重置邮件。
 */
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const email = ref('')
const loading = ref(false)
const err = ref('')
const ok = ref('')

/** 发送重置邮件 */
async function submit(): Promise<void> {
  err.value = ''
  ok.value = ''
  loading.value = true
  try {
    await auth.resetPassword(email.value)
    ok.value = '重置邮件已发送，请查收邮箱。'
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
      <h1>重置密码</h1>
      <p class="soft">输入注册邮箱，我们将发送重置链接。</p>
      <form class="form" @submit.prevent="submit">
        <label>
          邮箱
          <input v-model="email" type="email" required />
        </label>
        <p v-if="err" class="err">{{ err }}</p>
        <p v-if="ok" class="ok">{{ ok }}</p>
        <button type="submit" class="primary" :disabled="loading">发送邮件</button>
      </form>
      <p class="links"><router-link to="/login">返回登录</router-link></p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 70vh;
  display: grid;
  place-items: center;
  padding: 24px;
}
.auth-card {
  width: min(420px, 100%);
  padding: 28px 24px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: var(--surface-solid);
}
h1 {
  margin: 0 0 8px;
  font-family: var(--font-brand);
}
.soft {
  color: var(--ink-soft);
  margin-bottom: 16px;
}
.form {
  display: grid;
  gap: 12px;
}
label {
  display: grid;
  gap: 6px;
  font-size: 0.85rem;
}
input {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  font-size: 16px;
}
.err {
  color: var(--seal);
}
.ok {
  color: var(--teal);
}
button.primary {
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: var(--teal);
  color: var(--on-accent);
}
.links {
  margin-top: 14px;
  text-align: center;
}
.links a {
  color: var(--teal);
}
</style>
