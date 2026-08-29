<script setup lang="ts">
/**
 * 六爻起卦页：铜钱模拟 + 装卦展示 + 影子打架提示。
 */
import { onActivated, onMounted, ref } from 'vue'
import { castLiuYao, type LiuYaoResult, type YaoValue } from '@rules/liuyao/cast'
import { TIANGAN } from '@rules/constants'
import { useAssistContextStore } from '../stores/assistContext'

const assist = useAssistContextStore()
const dayGan = ref('甲')
const result = ref<LiuYaoResult | null>(null)
const rolling = ref(false)

/**
 * 发布六爻结果摘要到助手。
 * @param r 起卦结果
 */
function publishLiuYao(r: LiuYaoResult): void {
  const lines = [
    `本卦 ${r.benGuaName} · 变卦 ${r.bianGuaName} · 下${r.lower}上${r.upper}`,
    r.shadowFight ? '提示：跟影子打架' : '',
    ...r.hints,
    ...r.lines.map(
      (line) =>
        `${line.position}爻 ${line.liuqin}${line.naJiaZhi}${line.liushen}${line.isShi ? '世' : ''}${line.isYing ? '应' : ''}${line.moving ? '动' : ''}`
    )
  ]
  assist.publish({
    id: 'liuyao',
    title: '六爻',
    factsText: lines.filter(Boolean).join('\n')
  })
}

/**
 * 动画间隔后起卦，增强「摇卦」感。
 */
async function cast(): Promise<void> {
  rolling.value = true
  result.value = null
  await new Promise((r) => setTimeout(r, 420))
  result.value = castLiuYao({ dayGan: dayGan.value })
  rolling.value = false
  publishLiuYao(result.value)
}

/**
 * 演示「天水讼」固定爻，便于理解跟影子打架。
 */
function demoSong(): void {
  const values = [8, 7, 8, 7, 7, 7] as YaoValue[]
  result.value = castLiuYao({ dayGan: dayGan.value, values })
  publishLiuYao(result.value)
}

/**
 * 爻象字符。
 * @param yang 是否阳
 * @param moving 是否动
 */
function yaoGlyph(yang: boolean, moving: boolean): string {
  if (yang) return moving ? '━━━━○' : '━━━━━'
  return moving ? '━━ ━━×' : '━━ ━━━'
}

onMounted(() => {
  assist.setActiveFeature('liuyao')
})

onActivated(() => {
  assist.setActiveFeature('liuyao')
})
</script>

<template>
  <div class="page rise">
    <header class="head">
      <h1>六爻起卦</h1>
      <p>世为自己，应为对方。若断出虚争、螣蛇、讼象——先核实，别跟影子打架。</p>
    </header>

    <div class="panel">
      <label>
        日干（起六神）
        <select v-model="dayGan">
          <option v-for="g in TIANGAN" :key="g" :value="g">{{ g }}</option>
        </select>
      </label>
      <button type="button" class="primary" :disabled="rolling" @click="cast">
        {{ rolling ? '摇卦中…' : '铜钱起卦' }}
      </button>
      <button type="button" class="ghost" @click="demoSong">演示：天水讼</button>
    </div>

    <section v-if="result" class="result" :class="{ shadow: result.shadowFight }">
      <div class="titles">
        <h2>{{ result.benGuaName }}</h2>
        <p>变卦 {{ result.bianGuaName }} · 下{{ result.lower }}上{{ result.upper }}</p>
        <p v-if="result.shadowFight" class="badge">跟影子打架</p>
      </div>

      <div class="yao-board" :class="{ pulse: rolling }">
        <div
          v-for="line in [...result.lines].reverse()"
          :key="line.position"
          class="yao"
          :class="{ shi: line.isShi, ying: line.isYing, moving: line.moving }"
        >
          <span class="pos">{{ line.position }}</span>
          <span class="glyph">{{ yaoGlyph(line.yang, line.moving) }}</span>
          <span class="meta">
            {{ line.liuqin }} · {{ line.naJiaZhi }} · {{ line.liushen }}
            <template v-if="line.isShi"> · 世</template>
            <template v-if="line.isYing"> · 应</template>
            <template v-if="line.moving"> · 动</template>
          </span>
        </div>
      </div>

      <ul class="hints">
        <li v-for="(h, i) in result.hints" :key="i">{{ h }}</li>
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
  line-height: 1.6;
  max-width: 40em;
}
.panel {
  margin-top: 22px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: end;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
}
label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--input-bg);
}
button {
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid var(--ink);
}
button.primary {
  background: var(--ink);
  color: var(--on-accent);
  border-color: var(--ink);
}
button.ghost {
  background: transparent;
}
button:disabled {
  opacity: 0.6;
  cursor: wait;
}
.result {
  margin-top: 22px;
}
.result.shadow .badge {
  display: inline-block;
  margin-top: 8px;
  padding: 4px 10px;
  background: var(--seal);
  color: #fff8f4;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
}
.titles h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.6rem;
}
.titles p {
  margin: 6px 0 0;
  color: var(--ink-soft);
}
.yao-board {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 560px;
}
.yao {
  display: grid;
  grid-template-columns: 28px 120px 1fr;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border-left: 3px solid transparent;
  background: var(--surface);
  transition: transform 0.25s ease, border-color 0.25s ease;
}
.yao.shi {
  border-left-color: var(--teal);
}
.yao.ying {
  border-left-color: var(--gold);
}
.yao.moving {
  transform: translateX(4px);
}
.glyph {
  font-family: ui-monospace, monospace;
  letter-spacing: 0.05em;
  color: var(--ink);
}
.meta {
  font-size: 0.85rem;
  color: var(--ink-soft);
}
.hints {
  margin: 18px 0 0;
  padding-left: 1.1em;
  line-height: 1.75;
  color: var(--ink-soft);
  max-width: 46em;
}
.pulse {
  animation: ink-pulse 0.4s ease;
}
</style>
