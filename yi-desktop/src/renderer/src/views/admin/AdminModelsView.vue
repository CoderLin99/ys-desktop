<script setup lang="ts">
/**
 * 管理端：大模型与 API Key 配置（仅 admin 可见完整 Key）。
 */
import { onMounted, ref } from 'vue'
import {
  deleteLlmConfig,
  listLlmConfigs,
  maskApiKey,
  saveLlmConfig
} from '../../services/adminApi'
import type { Database } from '../../lib/supabase'

type LlmRow = Database['public']['Tables']['llm_configs']['Row']

const list = ref<LlmRow[]>([])
const loading = ref(false)
const err = ref('')
const saved = ref(false)

/** 编辑表单 */
const form = ref({
  id: '' as string | undefined,
  name: '',
  base_url: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  api_key: '',
  enabled: true,
  is_default: true
})

/** 加载列表 */
async function load(): Promise<void> {
  loading.value = true
  err.value = ''
  try {
    list.value = await listLlmConfigs()
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

/** 编辑已有项 */
function edit(row: LlmRow): void {
  form.value = {
    id: row.id,
    name: row.name,
    base_url: row.base_url,
    model: row.model,
    api_key: '',
    enabled: row.enabled,
    is_default: row.is_default
  }
}

/** 重置表单 */
function resetForm(): void {
  form.value = {
    id: undefined,
    name: '',
    base_url: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    api_key: '',
    enabled: true,
    is_default: !list.value.length
  }
}

/** 保存 */
async function save(): Promise<void> {
  err.value = ''
  saved.value = false
  try {
    await saveLlmConfig(form.value as LlmRow)
    saved.value = true
    resetForm()
    await load()
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  }
}

/** 删除 */
async function remove(id: string): Promise<void> {
  if (!confirm('确定删除该配置？')) return
  await deleteLlmConfig(id)
  await load()
}

onMounted(() => {
  resetForm()
  void load()
})
</script>

<template>
  <div class="admin-page">
    <section class="panel">
      <h2>{{ form.id ? '编辑模型' : '新增模型' }}</h2>
      <div class="grid">
        <label>名称<input v-model="form.name" placeholder="DeepSeek 主模型" /></label>
        <label>Base URL<input v-model="form.base_url" /></label>
        <label>Model<input v-model="form.model" /></label>
        <label>
          API Key
          <input v-model="form.api_key" type="password" :placeholder="form.id ? '留空则不修改' : '必填'" />
        </label>
        <label class="check"><input v-model="form.enabled" type="checkbox" /> 启用</label>
        <label class="check"><input v-model="form.is_default" type="checkbox" /> 默认模型</label>
      </div>
      <div class="actions">
        <button type="button" class="primary" @click="save">保存</button>
        <button v-if="form.id" type="button" class="ghost" @click="resetForm">取消编辑</button>
      </div>
      <p v-if="saved" class="ok">已保存</p>
      <p v-if="err" class="err">{{ err }}</p>
    </section>

    <section class="panel">
      <h2>已配置</h2>
      <p v-if="loading" class="soft">加载中…</p>
      <div v-else class="list">
        <article v-for="row in list" :key="row.id" class="card">
          <header>
            <strong>{{ row.name }}</strong>
            <span v-if="row.is_default" class="tag">默认</span>
            <span v-if="!row.enabled" class="tag off">停用</span>
          </header>
          <p class="meta">{{ row.base_url }} · {{ row.model }}</p>
          <p class="meta">Key: {{ maskApiKey(row.api_key) }}</p>
          <div class="actions">
            <button type="button" class="ghost" @click="edit(row)">编辑</button>
            <button type="button" class="ghost danger" @click="remove(row.id)">删除</button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.panel {
  padding: 16px 18px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--surface-solid);
  margin-bottom: 16px;
}
h2 {
  margin: 0 0 12px;
  font-size: 1rem;
  color: var(--teal);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
label {
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
label.check {
  flex-direction: row;
  align-items: center;
  grid-auto-flow: column;
  gap: 8px;
}
input[type='text'],
input[type='password'] {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--input-bg);
  font-size: 16px;
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
button.primary {
  background: var(--teal);
  color: var(--on-accent);
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
}
button.ghost {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--surface);
  cursor: pointer;
}
button.danger {
  color: var(--seal);
}
.list {
  display: grid;
  gap: 10px;
}
.card {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface-strong);
}
header {
  display: flex;
  gap: 8px;
  align-items: center;
}
.tag {
  font-size: 0.72rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--teal) 18%, transparent);
  color: var(--teal);
}
.tag.off {
  background: color-mix(in srgb, var(--seal) 15%, transparent);
  color: var(--seal);
}
.meta {
  font-size: 0.85rem;
  color: var(--ink-soft);
  margin: 4px 0 0;
}
.ok {
  color: var(--teal);
  margin-top: 8px;
}
.err {
  color: var(--seal);
  margin-top: 8px;
}
.soft {
  color: var(--muted);
}
</style>
