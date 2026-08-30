<script setup lang="ts">
/**
 * 全局命师助手：外观与交互对齐八字页「本盘追问」悬浮窗。
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import SelectButton from 'primevue/selectbutton'
import {
  askMingAgent,
  isAiConfigured,
  loadAiSettings,
  type AiPolishSettings,
  type MingAgentId,
  type MingChatMessage,
  MING_AGENT_OPTIONS
} from '@rules/bazi/aiPolish'
import { buildRagKnowledgeContext } from '@rules/bazi/rag/buildContext'
import { renderLiteMarkdown } from '@rules/bazi/mdLite'
import { glossPlainTalk } from '@rules/bazi/jargonPlain'
import {
  ASSIST_FEATURE_LABEL,
  useAssistContextStore,
  type AssistFeatureId
} from '../stores/assistContext'
import { useAuthStore } from '../stores/auth'
import { isCloudMembershipMode } from '../lib/cloudConfig'
import WhalePet from './WhalePet.vue'

const route = useRoute()
const assist = useAssistContextStore()
const auth = useAuthStore()
const {
  otherFilledSlots,
  extraIncludeIds,
  hasActiveFacts,
  activeFeature,
  activeSlot,
  isMultiFeatureAsk
} = storeToRefs(assist)

const open = ref(false)
const settings = ref<AiPolishSettings>(loadAiSettings())
const agentId = ref<MingAgentId>('general')
const draft = ref('')
const loading = ref(false)
const stream = ref('')
/** 当前功能对话镜像 */
const messages = ref<MingChatMessage[]>([])
const listEl = ref<HTMLElement | null>(null)

/** 拖拽后的视口坐标；未拖过则为 null */
const assistBox = ref<{ left: number; top: number; width: number; height: number } | null>(null)
/** 标题栏是否正在拖拽 */
const assistDragging = ref(false)
/** 本次拖拽起点 */
let assistDragOrigin = { px: 0, py: 0, left: 0, top: 0 }

/** 思考轮播文案（与八字页一致口吻） */
const THINK_STEPS = ['对照本页事实…', '组织断语结构…', '起草白话答复…'] as const
const thinkStep = ref(0)
let thinkTimer: ReturnType<typeof setInterval> | null = null

/** 路由 → 功能槽 */
const ROUTE_FEATURE: Record<string, AssistFeatureId> = {
  home: 'home',
  bazi: 'bazi',
  ziwei: 'ziwei',
  fengshui: 'fengshui',
  hehun: 'hehun',
  daily: 'daily',
  trend: 'trend',
  liuyao: 'liuyao',
  huangli: 'huangli'
}

/**
 * 从 store 载入当前功能对话。
 * @param id 功能 id
 */
function loadChatFor(id: AssistFeatureId | null): void {
  messages.value = id ? assist.getChat(id) : []
  stream.value = ''
  draft.value = ''
}

/**
 * 刷新本机大模型配置。
 */
function refreshSettings(): void {
  settings.value = loadAiSettings()
}

watch(
  () => route.name,
  (name) => {
    const id = typeof name === 'string' ? ROUTE_FEATURE[name] : undefined
    assist.setActiveFeature(id ?? null)
    loadChatFor(id ?? null)
    refreshSettings()
    open.value = false
    assistBox.value = null
  },
  { immediate: true }
)

const configured = computed(() => auth.canUseAi)
const canAsk = computed(() => hasActiveFacts.value && configured.value && !loading.value)

/** AI 未就绪时的引导文案 */
const aiGateHint = computed(() => {
  if (!isCloudMembershipMode()) {
    return '请先在「大模型配置」填写 API Key'
  }
  if (!auth.isLoggedIn) return '请先登录后使用 AI（会员中心）'
  if (!auth.emailVerified) return '请先验证邮箱后再使用 AI'
  if (!auth.isMember) return '请开通会员后使用 AI（会员中心申请）'
  return ''
})

/** 当前页标题 */
const activeTitle = computed(() => {
  const id = activeFeature.value
  return id ? ASSIST_FEATURE_LABEL[id] : '—'
})

/** 本页是否展示助手入口 */
const hostVisible = computed(() => {
  const name = route.name
  return typeof name === 'string' && Boolean(ROUTE_FEATURE[name])
})

/** 思考中：已发出、尚无正文 */
const thinking = computed(() => loading.value && !stream.value.trim())

/** 思考态标签 */
const thinkLabel = computed(
  () => `命师 · ${THINK_STEPS[thinkStep.value % THINK_STEPS.length]}`
)

/**
 * 启停思考轮播。
 * @param on 是否开启
 */
function setThinkSpin(on: boolean): void {
  if (thinkTimer) {
    clearInterval(thinkTimer)
    thinkTimer = null
  }
  if (!on) {
    thinkStep.value = 0
    return
  }
  thinkStep.value = 0
  thinkTimer = setInterval(() => {
    thinkStep.value = (thinkStep.value + 1) % THINK_STEPS.length
  }, 1400)
}

watch(thinking, (on) => setThinkSpin(on))

/**
 * 打开/关闭面板。
 * @param next 指定开关；缺省翻转
 */
function toggle(next?: boolean): void {
  open.value = typeof next === 'boolean' ? next : !open.value
  if (open.value) refreshSettings()
}

/**
 * 渲染轻量 Markdown（助手断语用白话加粗）。
 * @param text 原文
 * @param forLayperson 为真时把残留术语改成「人话（命理叫某某）」
 */
function mdHtml(text: string, forLayperson = false): string {
  return renderLiteMarkdown(forLayperson ? glossPlainTalk(text) : text)
}

/**
 * 滚动对话到底。
 */
async function scrollBottom(): Promise<void> {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

/**
 * 本页追问（首页会先按问题检索书库再答）。
 */
async function ask(): Promise<void> {
  const q = draft.value.trim()
  const featureId = activeFeature.value
  if (!q || !canAsk.value || !featureId) return
  draft.value = ''
  loading.value = true
  stream.value = ''
  messages.value.push({ role: 'user', text: q })
  assist.setChat(featureId, messages.value)
  await scrollBottom()
  try {
    const isGuide = featureId === 'home'
    /** 首页：按问题 BM25 检索书库，注入答疑材料 */
    let chartFacts = assist.buildAskFacts()
    let polishText = assist.buildAskPolish()
    if (isGuide) {
      const rag = await buildRagKnowledgeContext({
        structured: { topic: 'guide', q },
        queryOverride: q,
        topK: 8,
        maxChars: 7500,
        excludeSchools: ['yinzhai'],
        headerLabel: '命理书库'
      })
      chartFacts = `${chartFacts}\n\n${rag}`
      polishText = '（首页答疑：用法说明 + 书库检索，无排盘总批）'
    }
    const full = await askMingAgent(
      q,
      {
        chartFacts,
        polishText,
        agentId: agentId.value,
        multiFeature: isMultiFeatureAsk.value,
        mode: isGuide ? 'guide' : 'chart'
      },
      messages.value.slice(0, -1),
      settings.value,
      (acc) => {
        stream.value = acc
      }
    )
    messages.value.push({ role: 'assistant', text: full })
    stream.value = ''
    assist.setChat(featureId, messages.value)
  } catch (e) {
    messages.value.push({
      role: 'assistant',
      text: e instanceof Error ? `未能作答：${e.message}` : String(e)
    })
    stream.value = ''
    assist.setChat(featureId, messages.value)
  } finally {
    loading.value = false
    await scrollBottom()
  }
}

/**
 * 清空当前功能对话。
 */
function clearChat(): void {
  messages.value = []
  stream.value = ''
  assist.clearActiveChat()
}

/**
 * 拖拽后的定位样式。
 */
const assistDragStyle = computed(() => {
  const box = assistBox.value
  if (!box) return undefined
  return {
    left: `${box.left}px`,
    top: `${box.top}px`,
    right: 'auto',
    bottom: 'auto',
    width: `${box.width}px`,
    height: `${box.height}px`
  }
})

/**
 * 把助手窗口限制在视口内。
 */
function clampAssistBox(): void {
  const box = assistBox.value
  if (!box) return
  const margin = 8
  const maxL = Math.max(margin, window.innerWidth - box.width - margin)
  const maxT = Math.max(margin, window.innerHeight - box.height - margin)
  assistBox.value = {
    ...box,
    left: Math.min(maxL, Math.max(margin, box.left)),
    top: Math.min(maxT, Math.max(margin, box.top))
  }
}

/**
 * 绑定拖拽监听。
 */
function bindAssistDragListeners(): void {
  unbindAssistDragListeners()
  window.addEventListener('pointermove', onAssistPointerMove)
  window.addEventListener('pointerup', onAssistPointerUp)
}

/**
 * 卸掉拖拽监听。
 */
function unbindAssistDragListeners(): void {
  window.removeEventListener('pointermove', onAssistPointerMove)
  window.removeEventListener('pointerup', onAssistPointerUp)
}

/**
 * 标题栏按下开始拖。
 * @param ev 指针事件
 */
function onAssistPointerDown(ev: PointerEvent): void {
  if (window.matchMedia('(max-width: 900px)').matches) return
  const panel = (ev.currentTarget as HTMLElement | null)?.closest('.ai-assist') as HTMLElement | null
  if (!panel) return
  const r = panel.getBoundingClientRect()
  assistBox.value = { left: r.left, top: r.top, width: r.width, height: r.height }
  assistDragOrigin = { px: ev.clientX, py: ev.clientY, left: r.left, top: r.top }
  assistDragging.value = true
  bindAssistDragListeners()
  ev.preventDefault()
}

/**
 * 拖动中更新位置。
 * @param ev 指针事件
 */
function onAssistPointerMove(ev: PointerEvent): void {
  if (!assistDragging.value || !assistBox.value) return
  const { width, height } = assistBox.value
  assistBox.value = {
    left: assistDragOrigin.left + (ev.clientX - assistDragOrigin.px),
    top: assistDragOrigin.top + (ev.clientY - assistDragOrigin.py),
    width,
    height
  }
  clampAssistBox()
}

/**
 * 松开结束拖拽。
 */
function onAssistPointerUp(): void {
  assistDragging.value = false
  unbindAssistDragListeners()
}

onBeforeUnmount(() => {
  setThinkSpin(false)
  unbindAssistDragListeners()
})
</script>

<template>
  <Teleport to="body">
    <button
      v-show="hostVisible"
      type="button"
      class="ai-fab"
      :class="{ open, busy: loading }"
      :disabled="!hasActiveFacts"
      :title="hasActiveFacts ? `打开${activeTitle}命师助手` : '请先在本页完成排盘/推算'"
      aria-label="命师助手"
      @click="toggle()"
    >
      <WhalePet :open="open" :busy="loading" :disabled="!hasActiveFacts" label="命师" />
    </button>

    <div v-if="open && hostVisible" class="ai-assist-mask" aria-hidden="true" />

    <aside
      v-if="open && hostVisible"
      class="ai-assist"
      :class="{ dragging: assistDragging }"
      :style="assistDragStyle"
      role="dialog"
      aria-label="命师助手"
      @keydown.esc="toggle(false)"
    >
      <header class="ai-assist-head" title="拖动可移动窗口" @pointerdown="onAssistPointerDown">
        <div class="ai-assist-titles">
          <h2>命师助手</h2>
          <p>{{ activeTitle }} · 本页追问 · 可拖动</p>
        </div>
        <div class="ai-assist-tools">
          <button type="button" class="icon-btn" title="关闭" aria-label="关闭" @click="toggle(false)">
            ×
          </button>
        </div>
      </header>

      <div class="ai-assist-body">
        <p v-if="!configured" class="ai-assist-banner">
          {{ aiGateHint }}
          <router-link v-if="isCloudMembershipMode()" to="/member">前往会员中心</router-link>
          <router-link v-else to="/ai-settings">前往大模型配置</router-link>
        </p>

        <div class="ctx-bar">
          <span class="tag">本页</span>
          <div v-if="activeSlot" class="ctx-main">
            <strong>{{ activeSlot.title }}</strong>
            <small>已就绪 · {{ new Date(activeSlot.updatedAt).toLocaleString() }}</small>
          </div>
          <div v-else class="ctx-main soft">尚无排盘/推算结果</div>
        </div>

        <div v-if="otherFilledSlots.length" class="ctx-extra">
          <p class="soft">另引其他功能（可选，勾选后才会并入本次追问）</p>
          <div class="ctx-chips">
            <button
              v-for="s in otherFilledSlots"
              :key="s.id"
              type="button"
              class="chip"
              :class="{ on: extraIncludeIds.includes(s.id) }"
              @click="assist.setExtraIncluded(s.id, !extraIncludeIds.includes(s.id))"
            >
              {{ s.title }}
            </button>
          </div>
        </div>

        <div class="consult">
          <div class="consult-toolbar">
            <button type="button" class="chip" :disabled="!messages.length" @click="clearChat">
              清空对话
            </button>
          </div>
          <h3>{{ activeFeature === 'home' ? '用法与书库答疑' : '本页追问' }}</h3>
          <p class="soft">
            <template v-if="activeFeature === 'home'">
              可问本程序怎么用，或命理概念（离线书库检索取义）；不做具体排盘断命。
            </template>
            <template v-else>
              命师带着当前「{{ activeTitle }}」材料作答；换页对话独立保存，同页记忆在本会话内保留。
            </template>
          </p>
          <SelectButton
            v-model="agentId"
            class="consult-agents"
            :options="MING_AGENT_OPTIONS"
            option-label="label"
            option-value="id"
            :allow-empty="false"
            aria-label="命师席位"
          />
          <ul ref="listEl" class="consult-log">
            <li v-for="(m, i) in messages" :key="i" :class="m.role">
              <span class="who">{{ m.role === 'user' ? '问' : '断' }}</span>
              <div
                class="md-body"
                v-html="m.role === 'assistant' ? mdHtml(m.text, true) : mdHtml(m.text)"
              />
            </li>
            <li v-if="thinking" class="assistant thinking" aria-live="polite" aria-busy="true">
              <span class="who">断</span>
              <div class="think-box">
                <div class="think-row">
                  <span class="think-dots" aria-hidden="true"><i /><i /><i /></span>
                  <p class="think-label">{{ thinkLabel }}</p>
                </div>
                <p class="think-hint">正在组织断语，请稍候…</p>
              </div>
            </li>
            <li v-else-if="stream" class="assistant">
              <span class="who">断</span>
              <div class="md-body" v-html="mdHtml(stream, true)" />
            </li>
          </ul>
          <form class="consult-form" @submit.prevent="ask">
            <input
              v-model="draft"
              maxlength="200"
              :placeholder="
                activeFeature === 'home'
                  ? '例如：怎么排八字？天乙贵人是什么意思？'
                  : isMultiFeatureAsk
                    ? '已另引其他功能：可问综合对照…'
                    : `例如：这盘「${activeTitle}」要注意什么？`
              "
              :disabled="loading || !configured"
            />
            <button
              type="submit"
              class="submit"
              :disabled="loading || !draft.trim() || !canAsk"
            >
              {{ loading ? (thinking ? '思考中…' : '断语生成中…') : '追问' }}
            </button>
          </form>
        </div>
      </div>
    </aside>
  </Teleport>
</template>
