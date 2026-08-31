<script setup lang="ts">
/**
 * 大模型配置页：服务商、接口地址、密钥与模型名；与八字页悬浮助手解耦。
 */
import { onMounted, ref } from 'vue'
import {
  AI_PROVIDER_HINTS,
  fetchAiModels,
  fetchDeepSeekBalance,
  loadAiSettings,
  saveAiSettings,
  type AiPolishSettings,
  type DeepSeekBalanceResult
} from '@rules/bazi/aiPolish'

/** 本机 AI 配置 */
const settings = ref<AiPolishSettings>(loadAiSettings())
/** 已拉取的模型名列表 */
const models = ref<string[]>([])
/** 是否正在拉取模型 */
const loadingModels = ref(false)
/** 页面级错误文案 */
const error = ref('')
/** 保存成功轻提示 */
const savedTip = ref(false)
/** 保存提示定时器 */
let savedTimer: ReturnType<typeof setTimeout> | null = null
/** 正在查询 DeepSeek 余额 */
const loadingBalance = ref(false)
/** 余额查询结果 */
const balance = ref<DeepSeekBalanceResult | null>(null)
/** 余额人话错误 */
const balanceError = ref('')

/**
 * 查询 DeepSeek 官方余额（Bearer Key）。
 */
async function loadBalance(): Promise<void> {
  loadingBalance.value = true
  balanceError.value = ''
  try {
    balance.value = await fetchDeepSeekBalance(settings.value.apiKey)
  } catch (e) {
    balance.value = null
    balanceError.value = e instanceof Error ? e.message : String(e)
  } finally {
    loadingBalance.value = false
  }
}

/**
 * 应用内置服务商预设（只改地址与默认模型名）。
 * @param index 预设下标
 */
function applyProvider(index: number): void {
  const p = AI_PROVIDER_HINTS[index]
  if (!p) return
  settings.value = {
    ...settings.value,
    baseUrl: p.baseUrl,
    model: p.model
  }
  models.value = []
  persist()
}

/**
 * 把当前表单写入 localStorage。
 */
function persist(): void {
  saveAiSettings(settings.value)
  savedTip.value = true
  if (savedTimer) clearTimeout(savedTimer)
  savedTimer = setTimeout(() => {
    savedTip.value = false
  }, 1400)
}

/**
 * 按当前 Base URL + Key 拉取模型列表。
 */
async function loadModels(): Promise<void> {
  loadingModels.value = true
  error.value = ''
  try {
    const list = await fetchAiModels(settings.value)
    models.value = list
    if (list.length && !list.includes(settings.value.model)) {
      settings.value.model = list[0]
    }
    persist()
  } catch (e) {
    models.value = []
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loadingModels.value = false
  }
}

onMounted(() => {
  // 进入页时带出本机已存配置；模型列表需用户主动拉取（避免无 Key 时瞎请求）
  settings.value = loadAiSettings()
})
</script>

<template>
  <div class="page rise">
    <header class="head">
      <h1>大模型配置</h1>
      <p>
        配置 OpenAI 兼容接口后，各功能页右下角「命师助手」即可对本页结果追问。密钥只保存在本机。
      </p>
    </header>

    <section class="panel">
      <h2>快捷服务商</h2>
      <p class="soft">点选后会填入常用地址与默认模型，仍需自行填写 API Key（本地 Ollama 可留空）。</p>
      <div class="presets">
        <button
          v-for="(p, i) in AI_PROVIDER_HINTS"
          :key="p.name"
          type="button"
          class="chip"
          @click="applyProvider(i)"
        >
          <strong>{{ p.name }}</strong>
          <span>{{ p.note }}</span>
        </button>
      </div>
    </section>

    <section class="panel">
      <h2>接口参数</h2>
      <div class="form">
        <label class="wide">
          Base URL
          <input
            v-model="settings.baseUrl"
            type="url"
            placeholder="https://api.example.com/v1"
            @change="persist"
          />
        </label>
        <label class="wide">
          API Key
          <input
            v-model="settings.apiKey"
            type="password"
            autocomplete="off"
            placeholder="Bearer Token（本机保存）"
            @change="persist"
          />
        </label>
        <label class="wide">
          模型
          <select v-if="models.length" v-model="settings.model" @change="persist">
            <option v-for="m in models" :key="m" :value="m">{{ m }}</option>
          </select>
          <input
            v-else
            v-model="settings.model"
            type="text"
            placeholder="例如 deepseek-chat"
            @change="persist"
          />
        </label>
        <div class="actions">
          <button type="button" class="chip" :disabled="loadingModels" @click="loadModels">
            {{ loadingModels ? '拉取中…' : '拉取模型列表' }}
          </button>
          <button type="button" class="submit" @click="persist">保存</button>
          <span v-if="savedTip" class="tip">已保存</span>
        </div>
      </div>
      <p v-if="models.length" class="soft">已加载 {{ models.length }} 个模型，可下拉选择。</p>
      <p v-if="error" class="err">{{ error }}</p>
    </section>

    <section class="panel">
      <h2>DeepSeek 余额</h2>
      <p class="soft">走官方兼容接口查询账户额度，须填写 DeepSeek 平台发放的 Key（不是硅基流动等中转密钥）。</p>
      <div class="actions">
        <button type="button" class="chip" :disabled="loadingBalance" @click="loadBalance">
          {{ loadingBalance ? '查询中…' : '查询余额' }}
        </button>
        <span v-if="balance" class="tip">{{ balance.available ? '账户可用' : '账户暂不可用' }} · {{ balance.summary }}</span>
      </div>
      <ul v-if="balance?.infos.length" class="bal-list">
        <li v-for="info in balance.infos" :key="info.currency">
          {{ info.currency }} 总额 {{ info.total }} · 充值 {{ info.toppedUp }} · 赠金 {{ info.granted }}
        </li>
      </ul>
      <p v-if="balanceError" class="err">{{ balanceError }}</p>
    </section>

    <section class="panel tip-box">
      <h2>使用说明</h2>
      <ul>
        <li>各功能页完成排盘/推算后，点右下角「命师」即可对本页材料追问。</li>
        <li>默认只用当前页上下文；需要时再在助手里另引其他功能。</li>
        <li>换电脑或清缓存后需重新填写密钥。</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.head h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 2rem;
  letter-spacing: 0.08em;
}
.head p {
  margin: 8px 0 0;
  color: var(--ink-soft);
  max-width: 42em;
  line-height: 1.6;
}
.panel {
  margin-top: 20px;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
}
.panel h2 {
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: 1.15rem;
  color: var(--teal);
}
.soft {
  margin: 0 0 12px;
  color: var(--ink-soft);
  font-size: 0.9rem;
  line-height: 1.55;
}
.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface-strong);
  color: var(--ink);
  text-align: left;
}
.chip strong {
  font-size: 0.92rem;
}
.chip span {
  font-size: 0.75rem;
  color: var(--ink-soft);
}
.chip:hover {
  border-color: var(--teal);
}
.chip:disabled {
  opacity: 0.6;
  cursor: wait;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
label.wide input,
label.wide select {
  width: 100%;
  max-width: 420px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--input-bg);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.actions .chip {
  flex-direction: row;
  border-radius: 999px;
  padding: 8px 14px;
}
.submit {
  padding: 10px 18px;
  border: none;
  border-radius: 999px;
  background: var(--ink);
  color: var(--on-accent);
}
.bal-list {
  margin: 10px 0 0;
  padding-left: 1.2em;
  color: var(--ink-soft);
  line-height: 1.7;
}
.tip {
  font-size: 0.82rem;
  color: var(--teal);
}
.err {
  margin: 10px 0 0;
  color: var(--seal);
}
.tip-box ul {
  margin: 0;
  padding-left: 1.2em;
  color: var(--ink-soft);
  line-height: 1.7;
}
</style>
