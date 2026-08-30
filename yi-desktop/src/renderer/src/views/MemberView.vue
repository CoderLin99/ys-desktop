<script setup lang="ts">
/**
 * 会员中心：生成订单号 → 支付宝付款（备注订单号）→ 上传截图 → 人工审批。
 */
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { alipayQrUrl, isCloudMembershipMode } from '../lib/cloudConfig'
import { orderStatusLabel } from '../lib/orderStatus'

const auth = useAuthStore()
const router = useRouter()
const {
  isLoggedIn,
  emailVerified,
  isMember,
  memberExpireLabel,
  latestOrder,
  openOrder,
  hasPendingOrder,
  hasDraftOrder,
  user
} = storeToRefs(auth)

/** 补充说明 */
const note = ref('')
/** 付款截图 */
const proofFile = ref<File | null>(null)
/** 截图预览 URL */
const proofPreview = ref('')
/** 加载中 */
const loading = ref(false)
/** 成功提示 */
const msg = ref('')
/** 错误 */
const err = ref('')

const qr = computed(() => alipayQrUrl())
const orderStatus = computed(() => orderStatusLabel(latestOrder.value?.status))
/** 当前进行中订单号 */
const activeOrderNo = computed(() => openOrder.value?.order_no ?? '')

/**
 * 选择截图文件。
 * @param ev input change 事件
 */
function onPickProof(ev: Event): void {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!proofPreview.value.startsWith('blob:')) {
    // no-op
  }
  if (proofPreview.value) URL.revokeObjectURL(proofPreview.value)
  proofFile.value = file ?? null
  proofPreview.value = file ? URL.createObjectURL(file) : ''
}

/**
 * 生成订单号（draft）。
 */
async function createOrder(): Promise<void> {
  err.value = ''
  msg.value = ''
  loading.value = true
  try {
    const row = await auth.createMembershipOrder()
    msg.value = `订单号已生成：${row.order_no}，请转账时在备注中填写此订单号。`
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

/**
 * 复制订单号到剪贴板。
 */
async function copyOrderNo(): Promise<void> {
  if (!activeOrderNo.value) return
  await navigator.clipboard.writeText(activeOrderNo.value)
  msg.value = '订单号已复制'
}

/**
 * 提交截图与订单进入审批。
 */
async function submitOrder(): Promise<void> {
  err.value = ''
  msg.value = ''
  if (!proofFile.value) {
    err.value = '请先上传付款截图'
    return
  }
  loading.value = true
  try {
    await auth.submitMembershipOrder(proofFile.value, note.value)
    msg.value = '已提交审批，请等待管理员处理。'
    proofFile.value = null
    if (proofPreview.value) URL.revokeObjectURL(proofPreview.value)
    proofPreview.value = ''
    note.value = ''
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

/** 退出登录 */
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
          <strong>最近订单</strong> {{ latestOrder.order_no }} · {{ orderStatus }}
        </p>
        <button type="button" class="ghost" @click="logout">退出登录</button>
      </section>

      <!-- 已提交，待审批 -->
      <section v-if="isCloudMembershipMode() && !isMember && hasPendingOrder" class="panel pending">
        <h2>申请审核中</h2>
        <p class="order-no">订单号 <strong>{{ openOrder?.order_no }}</strong></p>
        <p>管理员通常在 24 小时内处理，通过后刷新本页即可使用 AI。</p>
        <a v-if="openOrder?.proof_url" :href="openOrder.proof_url" target="_blank" rel="noopener" class="proof-link">
          查看已上传的付款截图
        </a>
      </section>

      <!-- 已生成订单号，待付款 + 上传截图 -->
      <section v-else-if="isCloudMembershipMode() && !isMember && hasDraftOrder" class="panel pay">
        <h2>完成付款并提交</h2>
        <div class="order-pill">
          <span class="label">您的订单号</span>
          <strong class="no">{{ activeOrderNo }}</strong>
          <button type="button" class="ghost mini" @click="copyOrderNo">复制</button>
        </div>
        <ol class="steps">
          <li>支付宝扫码转账，<strong>备注务必填写上方订单号</strong></li>
          <li>保存转账成功截图</li>
          <li>下方上传截图并提交审批</li>
        </ol>
        <div v-if="qr" class="qr-wrap">
          <img :src="qr" alt="支付宝收款码" class="qr" />
        </div>
        <label class="file-label">
          付款截图（必填）
          <input type="file" accept="image/*" capture="environment" @change="onPickProof" />
        </label>
        <img v-if="proofPreview" :src="proofPreview" alt="截图预览" class="proof-preview" />
        <label>
          补充说明（可选）
          <textarea v-model="note" rows="2" placeholder="例：已转 29 元" />
        </label>
        <button type="button" class="primary" :disabled="loading || !proofFile" @click="submitOrder">
          {{ loading ? '提交中…' : '上传截图并提交审批' }}
        </button>
        <p v-if="msg" class="ok">{{ msg }}</p>
        <p v-if="err" class="err">{{ err }}</p>
      </section>

      <!-- 尚未生成订单 -->
      <section v-else-if="isCloudMembershipMode() && !isMember" class="panel pay">
        <h2>开通 AI 会员</h2>
        <ol class="steps">
          <li>点击下方「生成订单号」</li>
          <li>支付宝转账，备注填写订单号</li>
          <li>上传付款截图，等待管理员审批</li>
        </ol>
        <div v-if="qr" class="qr-wrap">
          <img :src="qr" alt="支付宝收款码" class="qr" />
        </div>
        <button
          type="button"
          class="primary"
          :disabled="loading || !emailVerified"
          @click="createOrder"
        >
          {{ loading ? '生成中…' : '生成订单号' }}
        </button>
        <p v-if="!emailVerified" class="warn">请先验证邮箱后再开通。</p>
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
.order-pill {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  margin-bottom: 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--teal) 10%, var(--surface-solid));
  border: 1px solid color-mix(in srgb, var(--teal) 30%, var(--line));
}
.order-pill .label {
  font-size: 0.85rem;
  color: var(--ink-soft);
  width: 100%;
}
.order-pill .no {
  font-family: var(--font-ui);
  font-size: 1.35rem;
  letter-spacing: 0.06em;
  color: var(--teal);
}
.order-no strong {
  font-family: var(--font-ui);
  letter-spacing: 0.05em;
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
  margin-top: 10px;
}
.file-label input[type='file'] {
  font-size: 16px;
}
textarea {
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--input-bg);
  font-size: 16px;
}
.proof-preview {
  max-width: 100%;
  max-height: 240px;
  margin-top: 10px;
  border-radius: 10px;
  border: 1px solid var(--line);
}
.proof-link {
  display: inline-block;
  margin-top: 10px;
  color: var(--teal);
}
.ok {
  color: var(--teal);
  margin-top: 10px;
}
.warn,
.err {
  color: var(--seal);
  margin-top: 8px;
}
button.primary,
button.ghost,
.link-btn {
  margin-top: 12px;
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
button.ghost {
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--ink);
}
button.ghost.mini {
  margin-top: 0;
  padding: 6px 12px;
  min-height: auto;
  font-size: 0.85rem;
}
.panel.pending {
  border-color: color-mix(in srgb, var(--gold) 40%, var(--line));
  background: color-mix(in srgb, var(--gold) 8%, var(--surface-solid));
}
</style>
