<script setup lang="ts">
/**
 * 八字合盘页：双人排盘 + 场景化合婚/合作/亲情分析；解读交给命师助手。
 */
import { computed, onActivated, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Lunar } from 'lunar-javascript'
import { buildBaZi, type BaZiChart } from '@rules/bazi/chart'
import { analyzeHeHun, HEHUN_KIND_OPTIONS, type HeHunKind, type HeHunResult } from '@rules/bazi/hehun'
import { useAssistContextStore } from '../stores/assistContext'
import { useBaziProfilesStore } from '../stores/baziProfiles'
import BirthDatePicker, { type BirthCalendarKind } from '../components/BirthDatePicker.vue'

const assist = useAssistContextStore()
const profilesStore = useBaziProfilesStore()
const { profiles } = storeToRefs(profilesStore)

/** 性别选项 */
const genderOptions = [
  { label: '男', value: 'male' as const },
  { label: '女', value: 'female' as const }
]

/** 合盘场景 */
const kind = ref<HeHunKind>('marriage')
const kindOptions = HEHUN_KIND_OPTIONS.map((o) => ({ label: o.label, value: o.value }))

/** 甲（主视角） */
const labelA = ref('甲方')
const genderA = ref<'male' | 'female'>('male')
const yearA = ref(1990)
const monthA = ref(5)
const dayA = ref(20)
const hourA = ref(8)
const hourUnknownA = ref(false)
/** 甲方历法 */
const calendarA = ref<BirthCalendarKind>('solar')
/** 甲方套用的命例 id */
const profileIdA = ref<string | null>(null)

/** 乙 */
const labelB = ref('乙方')
const genderB = ref<'male' | 'female'>('female')
const yearB = ref(1992)
const monthB = ref(8)
const dayB = ref(15)
const hourB = ref(14)
const hourUnknownB = ref(false)
/** 乙方历法 */
const calendarB = ref<BirthCalendarKind>('solar')
/** 乙方套用的命例 id */
const profileIdB = ref<string | null>(null)

/**
 * 表单年月日（可农历）换成排盘用公历。
 * @param cal 历法
 * @param y 年
 * @param m 月
 * @param d 日
 */
function toSolarYmd(
  cal: BirthCalendarKind,
  y: number,
  m: number,
  d: number
): { year: number; month: number; day: number } {
  if (cal === 'solar') return { year: y, month: m, day: d }
  const lu = Lunar.fromYmd(y, m, d)
  const s = lu.getSolar()
  return { year: s.getYear(), month: s.getMonth(), day: s.getDay() }
}

/**
 * 把命例套到甲或乙表单。
 * @param side 甲 / 乙
 * @param id 命例 id
 */
function applyProfileSide(side: 'A' | 'B', id: string | null): void {
  if (!id) {
    if (side === 'A') profileIdA.value = null
    else profileIdB.value = null
    return
  }
  const p = profilesStore.byId(id)
  if (!p) return
  if (side === 'A') {
    profileIdA.value = id
    labelA.value = p.label
    genderA.value = p.gender
    yearA.value = p.year
    monthA.value = p.month
    dayA.value = p.day
    hourUnknownA.value = p.hourUnknown
    hourA.value = p.hour ?? 12
    calendarA.value = 'solar'
  } else {
    profileIdB.value = id
    labelB.value = p.label
    genderB.value = p.gender
    yearB.value = p.year
    monthB.value = p.month
    dayB.value = p.day
    hourUnknownB.value = p.hourUnknown
    hourB.value = p.hour ?? 12
    calendarB.value = 'solar'
  }
}

const error = ref('')
const result = ref<HeHunResult | null>(null)
/** 最近一次合盘的双盘 */
const chartARef = ref<BaZiChart | null>(null)
const chartBRef = ref<BaZiChart | null>(null)

/** 当前场景说明 */
const kindHint = computed(() => HEHUN_KIND_OPTIONS.find((o) => o.value === kind.value)?.hint ?? '')

/**
 * 双方四柱摘要。
 */
function buildChartFacts(): string {
  const a = chartARef.value
  const b = chartBRef.value
  if (!a || !b) return ''
  const fmt = (c: BaZiChart, label: string) => {
    const p = [c.pillars.year.gz, c.pillars.month.gz, c.pillars.day.gz, c.pillars.hour?.gz ?? '时未知'].join(' ')
    return `${label}：${p} · 日主 ${c.dayMaster}（${c.dayMasterWuXing}）`
  }
  return [fmt(a, labelA.value), fmt(b, labelB.value)].join('\n')
}

/**
 * 发布合盘摘要到命师助手。
 * @param r 合盘结果
 */
function publishHeHun(r: HeHunResult): void {
  const lines = [
    buildChartFacts(),
    `场景 ${r.kind} · 综合 ${r.score}（${r.band}）`,
    ...r.dimensions.map((d) => `${d.name} ${d.score}`),
    ...r.lines.slice(0, 8),
    ...r.tips.slice(0, 4)
  ]
  assist.publish({
    id: 'hehun',
    title: '合盘',
    factsText: lines.filter(Boolean).join('\n')
  })
}

/**
 * 执行合盘。
 */
function runHeHun(): void {
  error.value = ''
  result.value = null
  try {
    const sa = toSolarYmd(calendarA.value, yearA.value, monthA.value, dayA.value)
    const sb = toSolarYmd(calendarB.value, yearB.value, monthB.value, dayB.value)
    const chartA = buildBaZi(sa.year, sa.month, sa.day, hourUnknownA.value ? null : hourA.value, 0)
    const chartB = buildBaZi(sb.year, sb.month, sb.day, hourUnknownB.value ? null : hourB.value, 0)
    chartARef.value = chartA
    chartBRef.value = chartB
    result.value = analyzeHeHun(chartA, chartB, genderA.value, genderB.value, kind.value)
    publishHeHun(result.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

/**
 * 更新时辰。
 * @param side 甲乙
 * @param h 小时或 null
 */
function onHour(side: 'A' | 'B', h: number | null): void {
  if (side === 'A') {
    hourUnknownA.value = h == null
    if (h != null) hourA.value = h
  } else {
    hourUnknownB.value = h == null
    if (h != null) hourB.value = h
  }
}

onMounted(() => {
  assist.setActiveFeature('hehun')
})

onActivated(() => {
  assist.setActiveFeature('hehun')
})
</script>

<template>
  <section class="page rise hehun">
    <header class="page-head">
      <p class="eyebrow">HEHUN</p>
      <h1>八字合盘</h1>
      <p class="lead">
        日支配偶宫、喜用互补、十神互见——规则先断，再用右下角命师追问相处节奏。
        <RouterLink to="/rules">读盘方法论</RouterLink>
      </p>
    </header>

    <section class="scene-card">
      <div class="scene-top">
        <h2 class="scene-title">合盘场景</h2>
        <p class="scene-hint">{{ kindHint }}</p>
      </div>
      <!-- 自绘分段：避开 PrimeVue SelectButton 选中态白底 -->
      <div class="seg kind-seg" role="radiogroup" aria-label="合盘场景">
        <button
          v-for="o in kindOptions"
          :key="o.value"
          type="button"
          class="seg-btn"
          :class="{ active: kind === o.value }"
          role="radio"
          :aria-checked="kind === o.value"
          @click="kind = o.value"
        >
          {{ o.label }}
        </button>
      </div>
    </section>

    <div class="dual-grid">
      <article class="person-card side-a">
        <header class="person-head">
          <span class="seal" aria-hidden="true">甲</span>
          <div class="person-titles">
            <h2>{{ labelA || '甲方' }}</h2>
            <p>主视角 · {{ calendarA === 'solar' ? '公历' : '农历' }}</p>
          </div>
        </header>

        <label class="field">
          <span class="lab">套用命例</span>
          <select
            class="ctrl"
            :value="profileIdA ?? ''"
            @change="applyProfileSide('A', ($event.target as HTMLSelectElement).value || null)"
          >
            <option value="">手填本盘</option>
            <option v-for="p in profiles" :key="'a' + p.id" :value="p.id">{{ p.label }}</option>
          </select>
        </label>

        <label class="field">
          <span class="lab">称呼</span>
          <input v-model="labelA" class="ctrl" type="text" maxlength="20" aria-label="甲方昵称" />
        </label>

        <div class="field">
          <span class="lab">性别</span>
          <div class="seg gender-seg" role="radiogroup" aria-label="甲方性别">
            <button
              v-for="o in genderOptions"
              :key="'a-' + o.value"
              type="button"
              class="seg-btn"
              :class="{ active: genderA === o.value }"
              role="radio"
              :aria-checked="genderA === o.value"
              @click="genderA = o.value"
            >
              {{ o.label }}
            </button>
          </div>
        </div>

        <BirthDatePicker
          v-model:calendar="calendarA"
          v-model:year="yearA"
          v-model:month="monthA"
          v-model:day="dayA"
          :hour="hourUnknownA ? null : hourA"
          @update:hour="(h) => onHour('A', h)"
        />
      </article>

      <div class="vs" aria-hidden="true">
        <span>合</span>
      </div>

      <article class="person-card side-b">
        <header class="person-head">
          <span class="seal seal-b" aria-hidden="true">乙</span>
          <div class="person-titles">
            <h2>{{ labelB || '乙方' }}</h2>
            <p>对照盘 · {{ calendarB === 'solar' ? '公历' : '农历' }}</p>
          </div>
        </header>

        <label class="field">
          <span class="lab">套用命例</span>
          <select
            class="ctrl"
            :value="profileIdB ?? ''"
            @change="applyProfileSide('B', ($event.target as HTMLSelectElement).value || null)"
          >
            <option value="">手填本盘</option>
            <option v-for="p in profiles" :key="'b' + p.id" :value="p.id">{{ p.label }}</option>
          </select>
        </label>

        <label class="field">
          <span class="lab">称呼</span>
          <input v-model="labelB" class="ctrl" type="text" maxlength="20" aria-label="乙方昵称" />
        </label>

        <div class="field">
          <span class="lab">性别</span>
          <div class="seg gender-seg" role="radiogroup" aria-label="乙方性别">
            <button
              v-for="o in genderOptions"
              :key="'b-' + o.value"
              type="button"
              class="seg-btn"
              :class="{ active: genderB === o.value }"
              role="radio"
              :aria-checked="genderB === o.value"
              @click="genderB = o.value"
            >
              {{ o.label }}
            </button>
          </div>
        </div>

        <BirthDatePicker
          v-model:calendar="calendarB"
          v-model:year="yearB"
          v-model:month="monthB"
          v-model:day="dayB"
          :hour="hourUnknownB ? null : hourB"
          @update:hour="(h) => onHour('B', h)"
        />
      </article>
    </div>

    <div class="actions">
      <button type="button" class="btn-run" @click="runHeHun">开始合盘</button>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <section v-if="result" class="result-card">
      <div class="score-block">
        <div class="score-ring" :data-band="result.band">
          <span class="score">{{ result.score }}</span>
          <span class="band">{{ result.band }}</span>
        </div>
        <div class="score-copy">
          <h2>综合观感</h2>
          <ul class="lines">
            <li v-for="(line, i) in result.lines" :key="i">{{ line }}</li>
          </ul>
        </div>
      </div>

      <h3 class="sec-title">四维拆解</h3>
      <div class="dims">
        <article v-for="d in result.dimensions" :key="d.name" class="dim">
          <div class="dim-top">
            <span>{{ d.name }}</span>
            <strong>{{ d.score }}</strong>
          </div>
          <div class="bar" aria-hidden="true">
            <i :style="{ width: `${Math.max(8, Math.min(100, d.score))}%` }" />
          </div>
          <p>{{ d.text }}</p>
        </article>
      </div>

      <h3 class="sec-title">相处提示</h3>
      <ul class="tips">
        <li v-for="(t, i) in result.tips" :key="i">{{ t }}</li>
      </ul>
      <p class="disclaimer">{{ result.disclaimer }}</p>
    </section>
  </section>
</template>

<style scoped>
.hehun {
  max-width: 980px;
}

.page-head {
  margin-bottom: 22px;
}

.page-head a {
  color: var(--teal);
  font-weight: 600;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 0.72rem;
  letter-spacing: 0.28em;
  color: var(--teal);
  font-weight: 700;
}

h1 {
  margin: 0;
  font-family: var(--font-brand);
  font-size: clamp(2rem, 5vw, 2.7rem);
  letter-spacing: 0.1em;
}

.lead {
  margin: 12px 0 0;
  color: var(--ink-soft);
  line-height: 1.7;
  max-width: 42em;
}

.scene-card {
  margin-bottom: 18px;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background:
    radial-gradient(ellipse 70% 80% at 100% 0%, color-mix(in srgb, var(--seal) 10%, transparent), transparent 50%),
    var(--surface-solid);
}

.scene-top {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.scene-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.05rem;
  letter-spacing: 0.08em;
  color: var(--ink);
}

.scene-hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--ink-soft);
}

/**
 * 场景 / 性别分段控件：未选淡墨底，选中实心 accent，杜绝白块。
 */
.seg {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.seg-btn {
  appearance: none;
  margin: 0;
  padding: 8px 16px;
  min-height: var(--touch-min, 40px);
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--ink) 14%, var(--line));
  background: color-mix(in srgb, var(--ink) 4%, var(--surface-solid));
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.9rem;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.12s ease;
}

.seg-btn:hover {
  border-color: color-mix(in srgb, var(--teal) 40%, var(--line));
  color: var(--ink);
  background: color-mix(in srgb, var(--teal) 10%, var(--surface-solid));
}

.seg-btn.active {
  border-color: transparent;
  background: linear-gradient(
    145deg,
    var(--teal),
    color-mix(in srgb, var(--teal) 72%, var(--ink))
  );
  color: var(--on-accent);
  font-weight: 700;
  box-shadow: 0 6px 16px color-mix(in srgb, var(--teal) 32%, transparent);
}

.seg-btn:active {
  transform: scale(0.97);
}

/* 乙方卡片：选中用印色，与甲侧青绿区分 */
.side-b .seg-btn.active {
  background: linear-gradient(
    145deg,
    var(--seal),
    color-mix(in srgb, var(--seal) 70%, var(--ink))
  );
  box-shadow: 0 6px 16px color-mix(in srgb, var(--seal) 32%, transparent);
}

.kind-seg .seg-btn {
  padding: 9px 18px;
  letter-spacing: 0.1em;
}

.dual-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 14px;
  align-items: start;
  margin-bottom: 18px;
}

.vs {
  align-self: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: 1.05rem;
  color: var(--on-accent);
  background: linear-gradient(145deg, var(--seal), color-mix(in srgb, var(--seal) 60%, var(--gold)));
  box-shadow: 0 8px 18px color-mix(in srgb, var(--seal) 35%, transparent);
}

.person-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: var(--surface-solid);
  box-shadow: 0 10px 28px color-mix(in srgb, var(--ink) 6%, transparent);
}

.side-a {
  background:
    radial-gradient(ellipse 90% 50% at 0% 0%, color-mix(in srgb, var(--teal) 12%, transparent), transparent 55%),
    var(--surface-solid);
}

.side-b {
  background:
    radial-gradient(ellipse 90% 50% at 100% 0%, color-mix(in srgb, var(--seal) 12%, transparent), transparent 55%),
    var(--surface-solid);
}

.person-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 4px;
  border-bottom: 1px dashed var(--line);
}

.seal {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  font-family: var(--font-display);
  font-size: 1.15rem;
  color: var(--on-accent);
  background: var(--teal);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--teal) 30%, transparent);
}

.seal-b {
  background: var(--seal);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--seal) 30%, transparent);
}

.person-titles h2 {
  margin: 0;
  font-size: 1.12rem;
  letter-spacing: 0.06em;
}

.person-titles p {
  margin: 2px 0 0;
  font-size: 0.75rem;
  color: var(--ink-soft);
}

.field {
  display: grid;
  gap: 6px;
}

.lab {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  color: var(--muted);
}

.ctrl {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--input-bg);
  color: var(--ink);
  font: inherit;
  min-height: var(--touch-min);
}

.actions {
  display: grid;
  gap: 10px;
  margin-bottom: 20px;
}

.btn-run {
  justify-self: start;
  min-width: min(100%, 220px);
  padding: 14px 28px;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--on-accent);
  background: linear-gradient(135deg, var(--seal), color-mix(in srgb, var(--seal) 65%, var(--gold)));
  box-shadow: 0 10px 24px color-mix(in srgb, var(--seal) 32%, transparent);
}

.btn-run:hover {
  filter: brightness(1.05);
}

.error {
  margin: 0;
  color: var(--seal);
}

.result-card {
  padding: 20px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--gold) 30%, var(--line));
  background:
    radial-gradient(ellipse 60% 40% at 0% 0%, color-mix(in srgb, var(--gold) 12%, transparent), transparent 50%),
    var(--surface-solid);
}

.score-block {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 18px;
  align-items: start;
  margin-bottom: 18px;
}

.score-ring {
  width: 108px;
  height: 108px;
  border-radius: 50%;
  display: grid;
  place-content: center;
  text-align: center;
  border: 3px solid color-mix(in srgb, var(--teal) 45%, var(--line));
  background: radial-gradient(circle at 40% 35%, color-mix(in srgb, var(--teal) 14%, var(--surface-solid)), var(--surface-solid));
  box-shadow: inset 0 0 0 6px color-mix(in srgb, var(--gold) 12%, transparent);
}

.score-ring[data-band='慎'] {
  border-color: color-mix(in srgb, var(--seal) 50%, var(--line));
}

.score {
  font-family: var(--font-brand);
  font-size: 2.4rem;
  line-height: 1;
  color: var(--ink);
}

.band {
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  color: var(--teal);
  font-weight: 700;
}

.score-ring[data-band='慎'] .band {
  color: var(--seal);
}

.score-copy h2 {
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: 1.1rem;
}

.lines,
.tips {
  margin: 0;
  padding-left: 1.15em;
  line-height: 1.7;
  color: var(--ink-soft);
}

.sec-title {
  margin: 8px 0 12px;
  font-family: var(--font-display);
  font-size: 1rem;
  letter-spacing: 0.1em;
  color: var(--ink);
}

.dims {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.dim {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--surface-strong) 80%, transparent);
}

.dim-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 0.92rem;
}

.dim-top strong {
  color: var(--teal);
  font-family: var(--font-display);
}

.bar {
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 8%, transparent);
  overflow: hidden;
  margin-bottom: 8px;
}

.bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--teal), color-mix(in srgb, var(--teal) 50%, var(--gold)));
}

.dim p {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--ink-soft);
}

.tips {
  margin-bottom: 14px;
}

.disclaimer {
  margin: 0;
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.55;
}

@media (max-width: 860px) {
  .dual-grid {
    grid-template-columns: 1fr;
  }

  .vs {
    justify-self: center;
    width: 36px;
    height: 36px;
    font-size: 0.95rem;
  }

  .score-block {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .lines {
    text-align: left;
  }

  .dims {
    grid-template-columns: 1fr;
  }

  .btn-run {
    width: 100%;
    justify-self: stretch;
  }
}
</style>
