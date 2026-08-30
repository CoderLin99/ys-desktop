<script setup lang="ts">
/**
 * 管理端：会员列表与手动延期。
 */
import { onMounted, ref } from 'vue'
import { listMemberships, listProfiles, setMembershipExpire } from '../../services/adminApi'

interface Row {
  user_id: string
  email: string
  expire_at: string
  role: string
}

const rows = ref<Row[]>([])
const loading = ref(false)
const err = ref('')
/** 编辑中的 userId */
const editingId = ref<string | null>(null)
/** 新到期时间 */
const newExpire = ref('')

/** 合并 profiles + memberships */
async function load(): Promise<void> {
  loading.value = true
  err.value = ''
  try {
    const [profiles, mems] = await Promise.all([listProfiles(), listMemberships()])
    const memMap = new Map(mems.map((m) => [m.user_id, m.expire_at]))
    rows.value = profiles.map((p) => ({
      user_id: p.id,
      email: p.email,
      role: p.role,
      expire_at: memMap.get(p.id) || ''
    }))
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

/** 保存到期时间 */
async function save(userId: string): Promise<void> {
  if (!newExpire.value) return
  try {
    await setMembershipExpire(userId, new Date(newExpire.value).toISOString())
    editingId.value = null
    await load()
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  }
}

onMounted(() => void load())
</script>

<template>
  <div class="admin-page">
    <button type="button" class="ghost" @click="load">刷新</button>
    <p v-if="err" class="err">{{ err }}</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>邮箱</th>
            <th>角色</th>
            <th>到期</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.user_id">
            <td>{{ r.email }}</td>
            <td>{{ r.role }}</td>
            <td>{{ r.expire_at ? new Date(r.expire_at).toLocaleString('zh-CN') : '—' }}</td>
            <td>
              <button type="button" class="link" @click="editingId = r.user_id">设置到期</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="editingId" class="edit-panel">
      <label>
        到期时间
        <input v-model="newExpire" type="datetime-local" />
      </label>
      <button type="button" class="primary" @click="save(editingId!)">保存</button>
      <button type="button" class="ghost" @click="editingId = null">取消</button>
    </div>
  </div>
</template>

<style scoped>
.table-wrap {
  overflow-x: auto;
  margin-top: 12px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
th,
td {
  border: 1px solid var(--line);
  padding: 8px 10px;
  text-align: left;
}
th {
  background: var(--stripe);
}
.link {
  background: none;
  border: none;
  color: var(--teal);
  cursor: pointer;
  text-decoration: underline;
}
.edit-panel {
  margin-top: 16px;
  padding: 14px;
  border: 1px dashed var(--line);
  border-radius: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: end;
}
label {
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
}
input {
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--line);
}
button.primary {
  background: var(--teal);
  color: var(--on-accent);
  border: none;
  padding: 8px 12px;
  border-radius: 8px;
}
button.ghost {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--surface);
}
.err {
  color: var(--seal);
}
</style>
