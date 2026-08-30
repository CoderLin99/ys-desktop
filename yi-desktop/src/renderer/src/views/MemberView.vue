<script setup lang="ts">
/**
 * 会员中心：状态展示、支付宝扫码开通、提交审批申请。
 */
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { alipayQrUrl, isCloudMembershipMode } from '../lib/cloudConfig'
import { orderStatusLabel } from '../lib/orderStatus'

const auth = useAuthStore()
const router = useRouter()
const { isLoggedIn, emailVerified, isMember, memberExpireLabel, latestOrder, user, hasPendingOrder } =
  storeToRefs(auth)

/** 转账备注说明 */
const note = ref('')
/** 提交中 */
const loading = ref(false)
/** 提示 */
const msg = ref('')
/** 错误 */
const err = ref('')

const qr = computed(() => alipayQrUrl())
const orderStatus = computed(() => orderStatusLabel(latestOrder.value?.status))
/** 复制用：建议支付宝备注 */
const emailForPay = computed(() => user.value?.email ?? '')

/**
 * 一键填入转账说明模板。
 */
function fillNoteTemplate(): void {
  if (!emailForPay.value) return
  note.value = `已转账，注册邮箱：${emailForPay.value}，请审批开通 AI 会员。`
}

/**
 * 提交开通申请。
 */
async function apply(): Promise<void> {
  err.value = ''
  msg.value = ''
  loading.value = true
  try {
    await auth.applyMembership(note.value)
    msg.value = '已提交申请，管理员审核通过后即可使用 AI。'
    note.value = ''
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

/** 退出 */
async function logout(): Promise<void> {
  await auth.logout()
  await router.push('/login')
}
</script>

<template>
  <div class="page rise member-page">
    <header class="head">
      <h1>会员中心</h1>
      <p v-if="isCloudMembershipMode()">Web 版 AI 解答需有效会员；排盘、黄历、罗盘等功能免费。</p>
      <p v-else>当前为本地/桌面模式，AI 请在「大模型配置」填写 Key，或配置云端会员环境。</p>
    </header>

    <section v-if="!isLoggedIn" class="panel">
      <p>请先登录后查看会员状态。</p>
      <router-link class="primary link-btn" to="/login">去登录</router-link>
    </section>

    <template v-else>
      <section class="panel status">
        <h2>账号</h2>
        <p><strong>邮箱</strong> {{ user?.email }}</p>
        <p>
          <strong>验证</strong>
          <span :class="emailVerified ? 'ok' : 'warn'">{{
            emailVerified ? '已验证' : '未验证（请查收邮件）'
          }}</span>
        </p>
        <p>
          <strong>会员</strong>
          <span :class="isMember ? 'ok' : 'warn'">{{ isMember ? '有效' : '未开通/已过期' }}</span>
        </p>
        <p><strong>到期</strong> {{ memberExpireLabel }}</p>
        <p v-if="latestOrder">
          <strong>最近申请</strong> {{ orderStatus }}
          <span v-if="latestOrder.created_at" class="soft">
            · {{ new Date(latestOrder.created_at).toLocaleString('zh-CN') }}
          </span>
        </p>
        <button type="button" class="ghost" @click="logout">退出登录</button>
      </section>

      <section v-if="isCloudMembershipMode() && !isMember && hasPendingOrder" class="panel pending">
        <h2>申请审核中</h2>
        <p>您的开通申请已提交，管理员通常在 24 小时内处理。通过后刷新本页即可使用 AI。</p>
        <p v-if="latestOrder?.note" class="soft">备注：{{ latestOrder.note }}</p>
      </section>

      <section v-else-if="isCloudMembershipMode() && !isMember" class="panel pay">
        <h2>开通 AI 会员</h2>
        <ol class="steps">
          <li>
            支付宝扫码转账（<strong>备注请写：{{ emailForPay }}</strong>）
          </li>
          <li>点击下方「填入说明模板」或自行填写转账信息</li>
          <li>提交后等待管理员在后台审批</li>
        </ol>
        <div v-if="qr" class="qr-wrap">
          <img :src="qr" alt="支付宝收款码" class="qr" />
        </div>
        <p v-else class="soft">管理员可在环境变量 VITE_ALIPAY_QR_URL 配置收款码图片。</p>
        <label>
          转账备注 / 说明（必填）
          <textarea v-model="note" rows="3" placeholder="例：已转账 29 元，备注邮箱 xxx@qq.com" />
        </label>
        <div class="btn-row">
          <button type="button" class="ghost" @click="fillNoteTemplate">填入说明模板</button>
          <button type="button" class="primary" :disabled="loading || !note.trim() || !emailVerified" @click="apply">
            {{ loading ? '提交中…' : '我已支付，申请开通' }}
          </button>
        </div>
        <p v-if="!emailVerified" class="warn">请先验证邮箱后再提交申请。</p>
        <p v-if="msg" class="ok">{{ msg }}</p>
        <p v-if="err" class="err">{{ err }}</p>
      </section>

      <section v-else-if="isMember" class="panel ok-panel">
        <h2>已开通</h2>
        <p>您可以使用右下角「命师助手」与各页 AI 解答功能。</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.member-page {
  max-width: 640px;
}
.head h1 {
  font-family: var(--font-brand);
  margin: 0;
}
.head p {
  color: var(--ink-soft);
  line-height: 1.6;
}
.panel {
  margin-top: 16px;
  padding: 18px 20px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--surface-solid);
}
.panel h2 {
  margin: 0 0 12px;
  font-size: 1.05rem;
  color: var(--teal);
}
.steps {
  margin: 0 0 14px;
  padding-left: 1.2em;
  line-height: 1.7;
  color: var(--ink-soft);
}
.qr-wrap {
  display: flex;
  justify-content: center;
  margin: 12px 0 16px;
}
.qr {
  max-width: 220px;
  border-radius: 12px;
  border: 1px solid var(--line);
}
label {
  display: grid;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
textarea {
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--input-bg);
  font-size: 16px;
  resize: vertical;
}
.ok {
  color: var(--teal);
}
.warn {
  color: var(--seal);
}
.err {
  color: var(--seal);
}
.soft {
  color: var(--muted);
  font-size: 0.88rem;
}
button.primary,
button.ghost,
.link-btn {
  margin-top: 10px;
  padding: 10px 16px;
  border-radius: 10px;
  min-height: var(--touch-min);
  cursor: pointer;
  display: inline-block;
  text-decoration: none;
  text-align: center;
}
button.primary,
.link-btn.primary {
  background: var(--teal);
  color: var(--on-accent);
  border: none;
}
.panel.pending {
  border-color: color-mix(in srgb, var(--gold) 40%, var(--line));
  background: color-mix(in srgb, var(--gold) 8%, var(--surface-solid));
}
.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}
.warn {
  color: var(--seal);
  font-size: 0.88rem;
  margin-top: 8px;
}
button.ghost {
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--ink);
}
</style>
