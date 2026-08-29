<script setup lang="ts">
/**
 * 词典式释义小浮层：锚定在点击名词旁，无全屏黑遮罩。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { MetricAnchor, RuleEvidence } from '@rules/bazi/evidence'
import { getMetricGloss, getTablesMeta } from '@rules/bazi/tables/load'

const props = defineProps<{
  /** 当前证据；null 关闭 */
  evidence: RuleEvidence | null
  /** 点击名词的位置；缺省则居中偏上 */
  anchor: MetricAnchor | null
}>()

const emit = defineEmits<{
  /** 关闭 */
  close: []
}>()

const panelRef = ref<HTMLElement | null>(null)
/** 计算后的样式 */
const panelStyle = ref<Record<string, string>>({})
/** 是否展开查法/步骤 */
const showMore = ref(false)
const tableMeta = getTablesMeta()

/** 释义正文 */
const glossText = computed(() => {
  if (!props.evidence) return ''
  return props.evidence.gloss || getMetricGloss(props.evidence.value)
})

/**
 * 按锚点把小窗摆在名词下方（不够空间则上方），并夹在视口内。
 */
async function placePanel(): Promise<void> {
  await nextTick()
  const el = panelRef.value
  if (!el || !props.evidence) return
  const gap = 8
  const vw = window.innerWidth
  const vh = window.innerHeight
  const rect = el.getBoundingClientRect()
  const aw = Math.min(320, vw - 16)
  let left = 12
  let top = 72
  if (props.anchor) {
    left = props.anchor.left
    top = props.anchor.bottom + gap
    if (top + rect.height > vh - 8) {
      top = props.anchor.top - rect.height - gap
    }
    if (left + aw > vw - 8) left = vw - aw - 8
    if (left < 8) left = 8
    if (top < 8) top = 8
  }
  panelStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${aw}px`
  }
}

watch(
  () => [props.evidence, props.anchor] as const,
  () => {
    showMore.value = false
    void placePanel()
  },
  { immediate: true }
)

/**
 * 点击浮层外关闭。
 * @param ev 指针事件
 */
function onDocPointer(ev: PointerEvent): void {
  if (!props.evidence) return
  const t = ev.target
  if (!(t instanceof Node)) return
  if (panelRef.value?.contains(t)) return
  // 点在 metric 触发器上时由父级改开新词，此处不拦
  if (t instanceof Element && t.closest('.metric-link, .metric-chip')) return
  emit('close')
}

/**
 * Esc 关闭。
 * @param ev 键盘
 */
function onKey(ev: KeyboardEvent): void {
  if (ev.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointer, true)
  document.addEventListener('keydown', onKey)
  window.addEventListener('resize', onReposition)
  window.addEventListener('scroll', onReposition, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointer, true)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onReposition)
  window.removeEventListener('scroll', onReposition, true)
})

/** 窗口变化时重定位 */
function onReposition(): void {
  void placePanel()
}
</script>

<template>
  <Teleport to="body">
    <aside
      v-if="evidence"
      ref="panelRef"
      class="dict-pop"
      role="tooltip"
      :aria-label="evidence.value + '释义'"
      :style="panelStyle"
    >
      <header class="dict-head">
        <strong class="dict-title">{{ evidence.value }}</strong>
        <button type="button" class="dict-x" aria-label="关闭" @click="emit('close')">×</button>
      </header>
      <p class="dict-gloss">{{ glossText }}</p>
      <p class="dict-basis">
        <span class="lab">本盘</span>
        {{ evidence.basis }}
      </p>
      <button type="button" class="dict-more" @click="showMore = !showMore">
        {{ showMore ? '收起查法' : '查法与步骤' }}
      </button>
      <div v-if="showMore" class="dict-extra">
        <p><span class="lab">查法</span>{{ evidence.rule }}</p>
        <ol v-if="evidence.steps?.length">
          <li v-for="(s, i) in evidence.steps" :key="i">{{ s }}</li>
        </ol>
        <p class="dict-foot">{{ tableMeta.label }} v{{ tableMeta.version }}</p>
      </div>
    </aside>
  </Teleport>
</template>

<style scoped>
.dict-pop {
  position: fixed;
  z-index: 90;
  max-height: min(50vh, 360px);
  overflow: auto;
  padding: 10px 12px 8px;
  border-radius: 10px;
  border: 1px solid var(--line, #d9cfc3);
  background: var(--surface-solid);
  color: var(--ink);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--ink) 18%, transparent);
  font-size: 0.88rem;
  line-height: 1.5;
}
.dict-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.dict-title {
  font-size: 0.98rem;
}
.dict-x {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1.15rem;
  line-height: 1;
  color: var(--ink-soft, #6a5a50);
  padding: 0 2px;
}
.dict-gloss {
  margin: 0 0 8px;
  color: var(--ink, #2a211c);
}
.dict-basis {
  margin: 0 0 6px;
  color: var(--ink-soft, #6a5a50);
  font-size: 0.82rem;
}
.lab {
  display: inline-block;
  margin-right: 6px;
  padding: 0 5px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--gold, #c4a574) 28%, transparent);
  color: var(--ink, #2a211c);
  font-size: 0.72rem;
  font-weight: 600;
}
.dict-more {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  color: var(--teal, #3d8b7a);
  font-size: 0.8rem;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.dict-extra {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--line, #d9cfc3);
  font-size: 0.8rem;
  color: var(--ink-soft, #6a5a50);
}
.dict-extra p {
  margin: 0 0 6px;
}
.dict-extra ol {
  margin: 0 0 6px;
  padding-left: 1.15em;
  display: grid;
  gap: 2px;
}
.dict-foot {
  margin: 0;
  opacity: 0.75;
  font-size: 0.72rem;
}
</style>
