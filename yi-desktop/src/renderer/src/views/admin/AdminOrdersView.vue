<script setup lang="ts">
/**
 * 管理端：待审批订单列表，通过/拒绝。
 */
import { onMounted, ref } from 'vue'
import { approveOrder, listOrders, rejectOrder } from '../../services/adminApi'
import { useAuthStore } from '../../stores/auth'
import { orderStatusLabel } from '../../lib/orderStatus'
import type { Database } from '../../lib/supabase'

type OrderRow = Database['public']['Tables']['orders']['Row']

const auth = useAuthStore()

const orders = ref<OrderRow[]>([])
const loading = ref(false)
const err = ref('')
const filter = ref<'pending' | 'all'>('pending')
/** 拒绝备注 */
const rejectNote = ref('')
/** 当前拒绝的订单 id */
const rejectingId = ref<string | null>(null)
/** 开通天数 */
const approveDays = ref(30)

/** 加载订单 */
async function load(): Promise<void> {
  loading.value = true
  err.value = ''
  try {
    orders.value = await listOrders(filter.value === 'pending' ? 'pending' : undefined)
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

/** 通过订单 */
async function approve(id: string): Promise<void> {
  try {
    await approveOrder(id, approveDays.value)
    await auth.refreshProfile()
    await load()
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  }
}

/** 拒绝订单 */
async function reject(id: string): Promise<void> {
  try {
    await rejectOrder(id, rejectNote.value)
    rejectingId.value = null
    rejectNote.value = ''
    await auth.refreshProfile()
    await load()
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  }
}

/** 复制邮箱到剪贴板（对照支付宝备注） */
async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

onMounted(() => void load())
</script>

<template>
  <div class="admin-page">
    <div class="toolbar">
      <label>
        筛选
        <select v-model="filter" @change="load">
          <option value="pending">待审批</option>
          <option value="all">全部</option>
        </select>
      </label>
      <label>
        开通天数
        <input v-model.number="approveDays" type="number" min="1" max="365" />
      </label>
      <button type="button" class="ghost" @click="load">刷新</button>
    </div>
    <p v-if="err" class="err">{{ err }}</p>
    <p v-if="loading" class="soft">加载中…</p>
    <div v-else-if="!orders.length" class="empty">暂无订单</div>
    <div v-else class="list">
      <article v-for="o in orders" :key="o.id" class="card">
        <header>
          <strong>{{ o.email }}</strong>
          <span class="badge" :class="o.status">{{ orderStatusLabel(o.status) }}</span>
        </header>
        <p class="meta">{{ new Date(o.created_at).toLocaleString('zh-CN') }}</p>
        <p v-if="o.note" class="note">{{ o.note }}</p>
        <p v-if="o.admin_note" class="admin-note">管理员：{{ o.admin_note }}</p>
        <div v-if="o.status === 'pending'" class="actions">
          <button type="button" class="primary" @click="approve(o.id)">通过 (+{{ approveDays }}天)</button>
          <button type="button" class="ghost mini" @click="copyText(o.email)">复制邮箱</button>
          <button type="button" class="ghost" @click="rejectingId = o.id">拒绝</button>
        </div>
        <div v-if="rejectingId === o.id" class="reject-box">
          <input v-model="rejectNote" placeholder="拒绝原因（可选）" />
          <button type="button" class="ghost" @click="reject(o.id)">确认拒绝</button>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: end;
  margin-bottom: 16px;
}
label {
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
select,
input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--input-bg);
  font-size: 16px;
}
.list {
  display: grid;
  gap: 12px;
}
.card {
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--surface-strong);
}
header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
.badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--stripe);
}
.badge.pending {
  background: color-mix(in srgb, var(--gold) 20%, transparent);
}
.badge.approved {
  background: color-mix(in srgb, var(--teal) 18%, transparent);
  color: var(--teal);
}
.badge.rejected {
  background: color-mix(in srgb, var(--seal) 15%, transparent);
  color: var(--seal);
}
.meta,
.note,
.admin-note {
  font-size: 0.88rem;
  color: var(--ink-soft);
  margin: 6px 0 0;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.reject-box {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
button.primary {
  background: var(--teal);
  color: var(--on-accent);
  border: none;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
}
button.ghost,
.ghost {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--surface);
  cursor: pointer;
}
.err {
  color: var(--seal);
}
.soft,
.empty {
  color: var(--muted);
}
</style>
