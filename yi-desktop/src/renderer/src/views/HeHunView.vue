<script setup lang="ts">
/**
 * 八字合盘页：双人排盘 + 场景化合婚/合作/亲情分析；解读交给命师助手。
 */
import { computed, onActivated, onMounted, ref } from 'vue'
import SelectButton from 'primevue/selectbutton'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { buildBaZi, type BaZiChart } from '@rules/bazi/chart'
import { analyzeHeHun, HEHUN_KIND_OPTIONS, type HeHunKind, type HeHunResult } from '@rules/bazi/hehun'
import { useAssistContextStore } from '../stores/assistContext'
import { useBaziProfilesStore } from '../stores/baziProfiles'

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
/** 乙方套用的命例 id */
const profileIdB = ref<string | null>(null)

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
  } else {
    profileIdB.value = id
    labelB.value = p.label
    genderB.value = p.gender
    yearB.value = p.year
    monthB.value = p.month
    dayB.value = p.day
    hourUnknownB.value = p.hourUnknown
    hourB.value = p.hour ?? 12
  }
}

const error = ref('')
const result = ref<HeHunResult | null>(null)
/** 最近一次合盘的双盘（供助手上下文） */
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
 * 将合盘结果摘要发布到命师助手。
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
    const chartA = buildBaZi(
      yearA.value,
      monthA.value,
      dayA.value,
      hourUnknownA.value ? null : hourA.value,
      0
    )
    const chartB = buildBaZi(
      yearB.value,
      monthB.value,
      dayB.value,
      hourUnknownB.value ? null : hourB.value,
      0
    )
    chartARef.value = chartA
    chartBRef.value = chartB
    result.value = analyzeHeHun(chartA, chartB, genderA.value, genderB.value, kind.value)
    publishHeHun(result.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
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
  <section class="page rise">
    <header class="page-head">
      <p class="eyebrow">HEHUN</p>
      <h1>八字合盘</h1>
      <p class="lead">
        日支配偶宫、喜用互补、十神互见——规则先断，合盘后用右下角命师助手追问相处解读。
        <RouterLink to="/rules">读盘方法论</RouterLink>
      </p>
    </header>

    <div class="panel">
      <label class="field-label">合盘场景</label>
      <SelectButton v-model="kind" :options="kindOptions" option-label="label" option-value="value" />
      <p class="muted">{{ kindHint }}</p>
    </div>

    <div class="dual-grid">
      <div class="panel person">
        <h2>{{ labelA }}</h2>
        <label class="field-label">
          套用命例
          <select
            :value="profileIdA ?? ''"
            @change="applyProfileSide('A', ($event.target as HTMLSelectElement).value || null)"
          >
            <option value="">手填</option>
            <option v-for="p in profiles" :key="'a' + p.id" :value="p.id">{{ p.label }}</option>
          </select>
        </label>
        <input v-model="labelA" class="input" type="text" aria-label="甲方昵称" />
        <SelectButton v-model="genderA" :options="genderOptions" option-label="label" option-value="value" />
        <div class="row">
          <input v-model.number="yearA" class="input sm" type="number" min="1900" max="2100" aria-label="甲年" />
          <input v-model.number="monthA" class="input sm" type="number" min="1" max="12" aria-label="甲月" />
          <input v-model.number="dayA" class="input sm" type="number" min="1" max="31" aria-label="甲日" />
        </div>
        <label class="check">
          <input v-model="hourUnknownA" type="checkbox" />
          时辰未知（三柱）
        </label>
        <input
          v-show="!hourUnknownA"
          v-model.number="hourA"
          class="input sm"
          type="number"
          min="0"
          max="23"
          aria-label="甲时"
        />
      </div>

      <div class="panel person">
        <h2>{{ labelB }}</h2>
        <label class="field-label">
          套用命例
          <select
            :value="profileIdB ?? ''"
            @change="applyProfileSide('B', ($event.target as HTMLSelectElement).value || null)"
          >
            <option value="">手填</option>
            <option v-for="p in profiles" :key="'b' + p.id" :value="p.id">{{ p.label }}</option>
          </select>
        </label>
        <input v-model="labelB" class="input" type="text" aria-label="乙方昵称" />
        <SelectButton v-model="genderB" :options="genderOptions" option-label="label" option-value="value" />
        <div class="row">
          <input v-model.number="yearB" class="input sm" type="number" min="1900" max="2100" aria-label="乙年" />
          <input v-model.number="monthB" class="input sm" type="number" min="1" max="12" aria-label="乙月" />
          <input v-model.number="dayB" class="input sm" type="number" min="1" max="31" aria-label="乙日" />
        </div>
        <label class="check">
          <input v-model="hourUnknownB" type="checkbox" />
          时辰未知（三柱）
        </label>
        <input
          v-show="!hourUnknownB"
          v-model.number="hourB"
          class="input sm"
          type="number"
          min="0"
          max="23"
          aria-label="乙时"
        />
      </div>
    </div>

    <button type="button" class="btn primary" @click="runHeHun">开始合盘</button>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="result" class="panel result">
      <div class="score-head">
        <span class="score">{{ result.score }}</span>
        <span class="band" :data-band="result.band">{{ result.band }}</span>
      </div>
      <ul class="lines">
        <li v-for="(line, i) in result.lines" :key="i">{{ line }}</li>
      </ul>
      <div class="dims">
        <div v-for="d in result.dimensions" :key="d.name" class="dim">
          <div class="dim-top">
            <span>{{ d.name }}</span>
            <strong>{{ d.score }}</strong>
          </div>
          <p>{{ d.text }}</p>
        </div>
      </div>
      <h3>相处提示</h3>
      <ul class="tips">
        <li v-for="(t, i) in result.tips" :key="i">{{ t }}</li>
      </ul>
      <p class="disclaimer">{{ result.disclaimer }}</p>
    </div>
  </section>
</template>

<style scoped>
.page {
  max-width: 920px;
  padding-bottom: 48px;
}

.page-head {
  margin-bottom: 24px;
}

.page-head a {
  color: var(--teal);
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  color: var(--teal);
  font-weight: 600;
}

h1 {
  margin: 0;
  font-family: var(--font-brand);
  font-size: clamp(2rem, 5vw, 2.8rem);
  letter-spacing: 0.08em;
}

.lead {
  margin: 12px 0 0;
  color: var(--ink-soft);
  line-height: 1.65;
  max-width: 40em;
}

.panel {
  background: var(--surface-solid);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 16px;
}

.field-label {
  display: block;
  font-size: 0.85rem;
  margin-bottom: 8px;
  color: var(--ink-soft);
}

.muted {
  margin: 10px 0 0;
  font-size: 0.88rem;
  color: var(--ink-soft);
}

.dual-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 720px) {
  .dual-grid {
    grid-template-columns: 1fr;
  }
}

.person h2 {
  margin: 0 0 12px;
  font-size: 1.1rem;
}

.input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--input-bg);
  margin-bottom: 10px;
}

.row {
  display: flex;
  gap: 8px;
}

.input.sm {
  flex: 1;
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  margin: 8px 0;
}

.btn.primary {
  display: inline-flex;
  padding: 12px 24px;
  border: none;
  border-radius: 999px;
  background: var(--seal);
  color: #fff8f4;
  cursor: pointer;
  margin-bottom: 16px;
}

.btn.primary:disabled {
  opacity: 0.6;
  cursor: wait;
}

.btn.secondary {
  display: inline-flex;
  padding: 12px 24px;
  border: 1px solid var(--seal);
  border-radius: 999px;
  background: transparent;
  color: var(--seal);
  cursor: pointer;
}

.btn.secondary:disabled {
  opacity: 0.6;
  cursor: wait;
}

.ai-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.error {
  color: var(--seal);
}

.score-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
}

.score {
  font-size: 3rem;
  font-family: var(--font-brand);
  line-height: 1;
}

.band[data-band='佳'] {
  color: var(--teal);
}
.band[data-band='慎'] {
  color: var(--seal);
}

.lines,
.tips {
  margin: 0 0 16px;
  padding-left: 1.2em;
  line-height: 1.65;
}

.dims {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
}

.dim {
  padding: 12px;
  border-radius: 10px;
  background: var(--input-bg);
  border: 1px solid var(--line);
}

.dim-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.disclaimer {
  font-size: 0.82rem;
  color: var(--ink-soft);
  margin: 0 0 16px;
}

.ai-block {
  border-top: 1px solid var(--line);
  padding-top: 16px;
}

.ai-body {
  margin-top: 12px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.ai-body :deep(strong) {
  color: var(--seal);
}
</style>
