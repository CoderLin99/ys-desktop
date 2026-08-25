<script setup lang="ts">
/**
 * 八字排盘页：公历起盘或手工四柱，展示十神与藏干。
 */
import { computed, ref } from 'vue'
import { buildBaZi, buildBaZiFromPillars, type BaZiChart } from '@rules/bazi/chart'
import { SHISHEN_BRIEF } from '@rules/bazi/shishen'

const mode = ref<'solar' | 'manual'>('solar')
const year = ref(1990)
const month = ref(5)
const day = ref(20)
const hour = ref(14)
const minute = ref(0)

const manualYear = ref('庚午')
const manualMonth = ref('辛巳')
const manualDay = ref('甲子')
const manualHour = ref('辛未')

const error = ref('')
const chart = ref<BaZiChart | null>(null)

/** 四柱展示顺序 */
const pillarKeys = [
  { key: 'year' as const, label: '年柱' },
  { key: 'month' as const, label: '月柱' },
  { key: 'day' as const, label: '日柱' },
  { key: 'hour' as const, label: '时柱' }
]

/**
 * 执行排盘。
 */
function run(): void {
  error.value = ''
  try {
    if (mode.value === 'solar') {
      chart.value = buildBaZi(year.value, month.value, day.value, hour.value, minute.value)
    } else {
      chart.value = buildBaZiFromPillars([
        manualYear.value.trim(),
        manualMonth.value.trim(),
        manualDay.value.trim(),
        manualHour.value.trim()
      ])
    }
  } catch (e) {
    chart.value = null
    error.value = e instanceof Error ? e.message : String(e)
  }
}

/** 日主简述 */
const dayBrief = computed(() => {
  if (!chart.value) return ''
  return `日主 ${chart.value.dayMaster}（${chart.value.dayMasterWuXing}）`
})

run()
</script>

<template>
  <div class="page rise">
    <header class="head">
      <h1>八字排盘</h1>
      <p>先定日主与十神，再谈「看别人」——对方没有准时间，就只能看到影子。</p>
    </header>

    <div class="panel">
      <div class="tabs">
        <button type="button" :class="{ on: mode === 'solar' }" @click="mode = 'solar'">公历起盘</button>
        <button type="button" :class="{ on: mode === 'manual' }" @click="mode = 'manual'">手工四柱</button>
      </div>

      <form class="form" @submit.prevent="run">
        <template v-if="mode === 'solar'">
          <label>年 <input v-model.number="year" type="number" min="1900" max="2100" /></label>
          <label>月 <input v-model.number="month" type="number" min="1" max="12" /></label>
          <label>日 <input v-model.number="day" type="number" min="1" max="31" /></label>
          <label>时 <input v-model.number="hour" type="number" min="0" max="23" /></label>
          <label>分 <input v-model.number="minute" type="number" min="0" max="59" /></label>
        </template>
        <template v-else>
          <label>年柱 <input v-model="manualYear" maxlength="2" /></label>
          <label>月柱 <input v-model="manualMonth" maxlength="2" /></label>
          <label>日柱 <input v-model="manualDay" maxlength="2" /></label>
          <label>时柱 <input v-model="manualHour" maxlength="2" /></label>
        </template>
        <button class="submit" type="submit">排盘</button>
      </form>
      <p v-if="error" class="err">{{ error }}</p>
    </div>

    <section v-if="chart" class="result">
      <h2>{{ dayBrief }}</h2>
      <div class="pillars">
        <article v-for="p in pillarKeys" :key="p.key" class="pillar">
          <h3>{{ p.label }}</h3>
          <p class="gz">{{ chart.pillars[p.key].gz }}</p>
          <p class="ss">{{ chart.pillars[p.key].ganShiShen }}</p>
          <ul>
            <li v-for="c in chart.pillars[p.key].canggan" :key="c.gan + c.shiShen">
              藏 {{ c.gan }} · {{ c.shiShen }}
            </li>
          </ul>
        </article>
      </div>
      <div class="notes">
        <p v-for="(n, i) in chart.notes" :key="i">{{ n }}</p>
        <p v-if="chart.pillars.day.ganShiShen === '日主'">
          对照：正印/偏印偏「吸收信息」；比劫偏「与人对照」——看别人前先看自己日主强弱语境。
        </p>
      </div>
      <details class="brief">
        <summary>十神速查</summary>
        <ul>
          <li v-for="(text, name) in SHISHEN_BRIEF" :key="name">
            <strong>{{ name }}</strong> — {{ text }}
          </li>
        </ul>
      </details>
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
  max-width: 40em;
  line-height: 1.6;
}
.panel {
  margin-top: 22px;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.45);
}
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.tabs button {
  border: 1px solid var(--line);
  background: transparent;
  padding: 8px 14px;
  border-radius: 999px;
  color: var(--ink-soft);
}
.tabs button.on {
  background: var(--teal);
  border-color: var(--teal);
  color: #f4fffb;
}
.form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: end;
}
label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
input {
  width: 88px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.8);
}
.submit {
  padding: 10px 18px;
  border: none;
  border-radius: 999px;
  background: var(--ink);
  color: #f3f7f4;
}
.err {
  color: var(--seal);
  margin: 10px 0 0;
}
.result {
  margin-top: 22px;
}
.result h2 {
  font-family: var(--font-display);
  font-size: 1.35rem;
}
.pillars {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.pillar {
  padding: 14px;
  border-top: 3px solid var(--teal);
  background: rgba(255, 255, 255, 0.5);
}
.pillar h3 {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ink-soft);
  font-weight: 600;
}
.gz {
  margin: 8px 0 4px;
  font-family: var(--font-display);
  font-size: 1.8rem;
  letter-spacing: 0.12em;
}
.ss {
  margin: 0;
  color: var(--seal);
  font-size: 0.95rem;
}
.pillar ul {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.8rem;
  color: var(--ink-soft);
  line-height: 1.6;
}
.notes {
  margin-top: 16px;
  color: var(--ink-soft);
  line-height: 1.7;
  font-size: 0.92rem;
}
.brief {
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px dashed var(--line);
  border-radius: 12px;
}
.brief ul {
  margin: 8px 0 0;
  padding-left: 1.1em;
  color: var(--ink-soft);
  line-height: 1.7;
}
@media (max-width: 900px) {
  .pillars {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
