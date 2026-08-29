<script setup lang="ts">
/**
 * 走势推演页：八字看中长期大运流年，六爻看近段事态。
 */
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import SelectButton from 'primevue/selectbutton'
import { buildBaZi } from '@rules/bazi/chart'
import { analyzeBaZiTrend, type BaZiTrend } from '@rules/bazi/trend'
import { castLiuYao, type LiuYaoResult } from '@rules/liuyao/cast'
import { analyzeLiuYaoTrend, type LiuYaoTrend, type TrendTopic } from '@rules/liuyao/trend'
import { TIANGAN } from '@rules/constants'
import { useAssistContextStore } from '../stores/assistContext'

const assist = useAssistContextStore()

const tab = ref<'bazi' | 'liuyao'>('bazi')
/** 走势页顶部分页 */
const tabOptions = [
  { label: '八字走势', value: 'bazi' },
  { label: '六爻走势', value: 'liuyao' }
]
/** 性别选项 */
const genderOptions = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' }
]

/** —— 八字输入 —— */
const gender = ref<'male' | 'female'>('male')
const year = ref(1990)
const month = ref(5)
const day = ref(20)
const hour = ref(14)
/** 时辰未知时排三柱再推走势 */
const hourUnknown = ref(false)
const fromYear = ref(new Date().getFullYear())
const baziError = ref('')
const baziTrend = ref<BaZiTrend | null>(null)

/**
 * 发布走势摘要（八字或六爻，以当前有结果的为准）。
 */
function publishTrend(): void {
  const parts: string[] = []
  if (baziTrend.value) {
    const t = baziTrend.value
    parts.push(
      `【八字走势】强弱 ${t.strength} · 喜用 ${t.useful.join('、')} · 忌 ${t.avoid.join('、')}`,
      t.patternSummary,
      t.lifeArc,
      ...t.dayun.slice(0, 4).map((d) => d.summary),
      ...t.years.slice(0, 5).map((y) => y.summary)
    )
  }
  if (liuTrend.value && gua.value) {
    const lt = liuTrend.value
    parts.push(
      `【六爻走势】${gua.value.benGuaName}→${gua.value.bianGuaName} · ${lt.headline}（${lt.score}/${lt.band}）`,
      ...lt.points.slice(0, 6),
      lt.advice
    )
  }
  if (!parts.length) return
  assist.publish({
    id: 'trend',
    title: '走势',
    factsText: parts.join('\n')
  })
}

/**
 * 推演八字走势。
 */
function runBaZi(): void {
  baziError.value = ''
  try {
    const chart = buildBaZi(
      year.value,
      month.value,
      day.value,
      hourUnknown.value ? null : hour.value,
      0
    )
    baziTrend.value = analyzeBaZiTrend(chart, {
      gender: gender.value,
      fromYear: fromYear.value,
      yearSpan: 12
    })
    publishTrend()
  } catch (e) {
    baziTrend.value = null
    baziError.value = e instanceof Error ? e.message : String(e)
  }
}

/** 流年柱状最大分，用于归一化高度 */
const maxYearScore = computed(() => {
  if (!baziTrend.value?.years.length) return 100
  return Math.max(...baziTrend.value.years.map((y) => y.score), 1)
})

/** —— 六爻输入 —— */
const dayGan = ref('甲')
const topic = ref<TrendTopic>('overall')
const gua = ref<LiuYaoResult | null>(null)
const liuTrend = ref<LiuYaoTrend | null>(null)
const rolling = ref(false)

const topicOptions: { value: TrendTopic; label: string }[] = [
  { value: 'overall', label: '整体' },
  { value: 'career', label: '事业' },
  { value: 'wealth', label: '财运' },
  { value: 'relation', label: '人际' }
]

/**
 * 铜钱起卦并解读走势。
 */
async function runLiuYao(): Promise<void> {
  rolling.value = true
  await new Promise((r) => setTimeout(r, 360))
  gua.value = castLiuYao({ dayGan: dayGan.value })
  liuTrend.value = analyzeLiuYaoTrend(gua.value, topic.value)
  rolling.value = false
  publishTrend()
}

/** 主题变更时，若已有卦则重算解读 */
watch(topic, () => {
  if (gua.value) {
    liuTrend.value = analyzeLiuYaoTrend(gua.value, topic.value)
    publishTrend()
  }
})

onMounted(() => {
  assist.setActiveFeature('trend')
})

onActivated(() => {
  assist.setActiveFeature('trend')
})

runBaZi()
</script>

<template>
  <div class="page rise">
    <header class="head">
      <h1>走势推演</h1>
      <p>
        八字看中长期大运与流年起伏；六爻看近段事态顺逆。都是「大概走势」，用来对照行动，不是判决书。
      </p>
    </header>

    <SelectButton
      v-model="tab"
      class="pv-seg"
      :options="tabOptions"
      optionLabel="label"
      optionValue="value"
      :allowEmpty="false"
      aria-label="走势类型"
    />

    <!-- 八字 -->
    <section v-show="tab === 'bazi'" class="panel">
      <form class="form" @submit.prevent="runBaZi">
        <div class="pv-field">
          <span class="field-label">性别</span>
          <SelectButton
            v-model="gender"
            :options="genderOptions"
            optionLabel="label"
            optionValue="value"
            :allowEmpty="false"
            aria-label="性别"
          />
        </div>
        <label>年 <input v-model.number="year" type="number" min="1900" max="2100" /></label>
        <label>月 <input v-model.number="month" type="number" min="1" max="12" /></label>
        <label>日 <input v-model.number="day" type="number" min="1" max="31" /></label>
        <label>
          时
          <input v-model.number="hour" type="number" min="0" max="23" :disabled="hourUnknown" />
        </label>
        <label class="check">
          <input v-model="hourUnknown" type="checkbox" />
          时辰未知
        </label>
        <label>流年起 <input v-model.number="fromYear" type="number" min="1950" max="2100" /></label>
        <button class="submit" type="submit">推演走势</button>
      </form>
      <p v-if="baziError" class="err">{{ baziError }}</p>

      <div v-if="baziTrend" class="block">
        <h2>格局粗判</h2>
        <p class="lead-line">
          日主<strong>{{ baziTrend.strength }}</strong>
          （能量 {{ baziTrend.strengthScore }}）· 喜用
          <strong>{{ baziTrend.useful.join('、') }}</strong>
          · 慎
          {{ baziTrend.avoid.join('、') }}
          <template v-if="baziTrend.cong.kind !== '不从'"
            >· 从格 <strong>{{ baziTrend.cong.kind }}{{ baziTrend.cong.follow ? '·' + baziTrend.cong.follow : '' }}</strong></template
          >
        </p>
        <p class="soft">{{ baziTrend.strengthBreakdown.text }}</p>
        <p>{{ baziTrend.patternSummary }}</p>
        <p>{{ baziTrend.lifeArc }}</p>

        <h2>大运倾向</h2>
        <div class="dayun">
          <article v-for="d in baziTrend.dayun" :key="d.index" class="dayun-item">
            <span class="idx">{{ d.ageFrom }}–{{ d.ageTo }}岁</span>
            <strong>{{ d.gz }}</strong>
            <span class="score">{{ d.score }}</span>
            <p>{{ d.summary }}</p>
          </article>
        </div>

        <h2>近 {{ baziTrend.years.length }} 年流年走势</h2>
        <div class="chart" role="img" aria-label="流年走势柱状图">
          <div v-for="y in baziTrend.years" :key="y.year" class="bar-col">
            <div
              class="bar"
              :class="y.band"
              :style="{ height: `${Math.round((y.score / maxYearScore) * 100)}%` }"
              :title="y.summary"
            />
            <span class="yr">{{ String(y.year).slice(2) }}</span>
            <span class="sc">{{ y.score }}</span>
          </div>
        </div>

        <ul class="year-list">
          <li v-for="y in baziTrend.years" :key="y.year + y.gz">
            <strong>{{ y.year }} {{ y.gz }}</strong>
            <span class="tag" :class="y.band">{{ y.band }}</span>
            <span>事业：{{ y.aspects.career }}</span>
            <span>财运：{{ y.aspects.wealth }}</span>
            <span>人际：{{ y.aspects.relation }}</span>
          </li>
        </ul>
        <p class="disc">{{ baziTrend.disclaimer }}</p>
      </div>
    </section>

    <!-- 六爻 -->
    <section v-show="tab === 'liuyao'" class="panel">
      <div class="form">
        <label>
          日干
          <select v-model="dayGan">
            <option v-for="g in TIANGAN" :key="g" :value="g">{{ g }}</option>
          </select>
        </label>
        <label>
          问事
          <select v-model="topic">
            <option v-for="t in topicOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </label>
        <button type="button" class="submit" :disabled="rolling" @click="runLiuYao">
          {{ rolling ? '摇卦中…' : '起卦看走势' }}
        </button>
      </div>

      <div v-if="liuTrend && gua" class="block">
        <h2>{{ gua.benGuaName }} → {{ gua.bianGuaName }}</h2>
        <p class="lead-line">
          近段评分 <strong>{{ liuTrend.score }}</strong>
          <span class="tag" :class="liuTrend.band">{{ liuTrend.band }}</span>
        </p>
        <p class="headline">{{ liuTrend.headline }}</p>
        <ul>
          <li v-for="(p, i) in liuTrend.points" :key="i">{{ p }}</li>
        </ul>
        <p class="advice">建议：{{ liuTrend.advice }}</p>
        <p v-if="liuTrend.shadowLike" class="shadow">提示：可能在跟影子打架，先核实再行动。</p>
      </div>
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
  line-height: 1.65;
  max-width: 42em;
}
.pv-seg {
  margin: 20px 0 12px;
}
.panel {
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
}
.form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: end;
}
.form > label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.pv-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.field-label {
  line-height: 1.2;
}
label.check {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.form input,
.form select {
  width: 88px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--input-bg);
}
.form select {
  width: auto;
  min-width: 88px;
}
.form input[type='checkbox'] {
  width: auto;
}
.submit {
  padding: 10px 18px;
  border: none;
  border-radius: 999px;
  background: var(--ink);
  color: var(--on-accent);
}
.submit:disabled {
  opacity: 0.6;
  cursor: wait;
}
.err {
  color: var(--seal);
}
.block {
  margin-top: 18px;
}
.block h2 {
  margin: 18px 0 10px;
  font-family: var(--font-display);
  font-size: 1.15rem;
  color: var(--teal);
}
.lead-line {
  line-height: 1.7;
}
.soft {
  color: var(--ink-soft);
  line-height: 1.65;
  font-size: 0.92rem;
}
.dayun {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}
.dayun-item {
  padding: 12px;
  background: var(--surface-strong);
  border-top: 3px solid var(--teal);
}
.dayun-item .idx {
  display: block;
  font-size: 0.75rem;
  color: var(--ink-soft);
}
.dayun-item strong {
  font-family: var(--font-display);
  font-size: 1.35rem;
  letter-spacing: 0.08em;
}
.dayun-item .score {
  color: var(--seal);
  margin-left: 6px;
  font-size: 0.9rem;
}
.dayun-item p {
  margin: 6px 0 0;
  font-size: 0.82rem;
  color: var(--ink-soft);
  line-height: 1.5;
}
.chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 160px;
  padding: 8px 4px 0;
  border-bottom: 1px solid var(--line);
}
.bar-col {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}
.bar {
  width: 70%;
  min-height: 8px;
  border-radius: 6px 6px 2px 2px;
  background: var(--teal);
  transition: height 0.35s ease;
}
.bar.高 {
  background: var(--seal);
}
.bar.平 {
  background: var(--gold);
}
.bar.低 {
  background: var(--muted);
}
.yr,
.sc {
  font-size: 0.68rem;
  color: var(--ink-soft);
}
.year-list {
  list-style: none;
  padding: 0;
  margin: 14px 0 0;
  display: grid;
  gap: 10px;
}
.year-list li {
  display: grid;
  gap: 4px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
  font-size: 0.9rem;
  color: var(--ink-soft);
  line-height: 1.5;
}
.tag {
  display: inline-block;
  width: fit-content;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  background: rgba(20, 35, 28, 0.08);
}
.tag.高 {
  background: rgba(181, 64, 42, 0.15);
  color: var(--seal);
}
.tag.平 {
  background: rgba(166, 132, 58, 0.18);
  color: #7a5f20;
}
.tag.低 {
  background: rgba(106, 127, 118, 0.2);
}
.disc,
.advice {
  margin-top: 12px;
  color: var(--ink-soft);
  line-height: 1.65;
  font-size: 0.9rem;
}
.headline {
  font-family: var(--font-display);
  font-size: 1.15rem;
}
.shadow {
  color: var(--seal);
}
.block ul {
  color: var(--ink-soft);
  line-height: 1.7;
}
</style>
