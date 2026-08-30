<script setup lang="ts">
/**
 * 每日运势页：选命例或临时排盘，叠今日流日与流年规则分。
 */
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import SelectButton from 'primevue/selectbutton'
import { storeToRefs } from 'pinia'
import { buildBaZi } from '@rules/bazi/chart'
import { buildDailyFortune, lunarLabelOf, type DailyFortune } from '@rules/bazi/dailyFortune'
import { useBaziProfilesStore } from '../stores/baziProfiles'
import { useAssistContextStore } from '../stores/assistContext'

const profilesStore = useBaziProfilesStore()
const { profiles, activeProfileId } = storeToRefs(profilesStore)
const assist = useAssistContextStore()

/** 性别选项 */
const genderOptions = [
  { label: '男', value: 'male' as const },
  { label: '女', value: 'female' as const }
]

const useProfile = ref(true)
const gender = ref<'male' | 'female'>('male')
const year = ref(1990)
const month = ref(5)
const day = ref(20)
const hour = ref(8)
const hourUnknown = ref(false)
const saveLabel = ref('我的命盘')

const error = ref('')
const fortune = ref<DailyFortune | null>(null)

/** 农历日展示 */
const lunarLabel = computed(() => lunarLabelOf(new Date()))

/**
 * 将日运结果摘要发布到命师助手。
 * @param f 日运结果
 */
function publishDaily(f: DailyFortune): void {
  const lines = [
    `日期 ${f.solarDate} · 综合 ${f.score}（${f.band}）`,
    `流日 ${f.dayGz}（${f.dayShiShen}）· 流年 ${f.yearGz}（${f.yearShiShen}）`,
    f.summary,
    `宜：${f.doList.join('、') || '—'}`,
    `忌：${f.avoidList.join('、') || '—'}`,
    ...f.aspects.map((a) => `${a.label}${a.score}：${a.hint}`)
  ]
  assist.publish({
    id: 'daily',
    title: '日运',
    factsText: lines.join('\n')
  })
}

/**
 * 从当前表单或命例构建盘并算日运。
 */
function runDaily(): void {
  error.value = ''
  fortune.value = null
  try {
    let g = gender.value
    let y = year.value
    let m = month.value
    let d = day.value
    let h: number | null = hour.value

    if (useProfile.value && activeProfileId.value) {
      const p = profilesStore.byId(activeProfileId.value)
      if (p) {
        g = p.gender
        y = p.year
        m = p.month
        d = p.day
        h = p.hourUnknown ? null : p.hour
      }
    } else if (hourUnknown.value) {
      h = null
    }

    const chart = buildBaZi(y, m, d, h, 0)
    fortune.value = buildDailyFortune(chart, g, new Date())
    publishDaily(fortune.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

/**
 * 保存当前表单为命例。
 */
function saveProfile(): void {
  profilesStore.upsert({
    label: saveLabel.value || '未命名',
    gender: gender.value,
    year: year.value,
    month: month.value,
    day: day.value,
    hour: hourUnknown.value ? null : hour.value,
    hourUnknown: hourUnknown.value
  })
}

/** 选中命例时同步表单 */
watch(activeProfileId, (id) => {
  const p = profilesStore.byId(id ?? null)
  if (!p) return
  gender.value = p.gender
  year.value = p.year
  month.value = p.month
  day.value = p.day
  hour.value = p.hour ?? 8
  hourUnknown.value = p.hourUnknown
  saveLabel.value = p.label
})

onMounted(() => {
  assist.setActiveFeature('daily')
})

onActivated(() => {
  assist.setActiveFeature('daily')
})

runDaily()
</script>

<template>
  <section class="page rise">
    <header class="page-head">
      <p class="eyebrow">DAILY</p>
      <h1>每日运势</h1>
      <p class="lead">
        以本命喜用叠今日流日、今年流年打分，只用可编码规则，不编造具体事件。
      </p>
      <p class="lunar">{{ lunarLabel }} · {{ new Date().toLocaleDateString('zh-CN') }}</p>
    </header>

    <div class="panel">
      <label class="check">
        <input v-model="useProfile" type="checkbox" />
        使用已保存命例
      </label>
      <select
        v-if="useProfile && profiles.length"
        v-model="activeProfileId"
        class="input"
        aria-label="选择命例"
      >
        <option v-for="p in profiles" :key="p.id" :value="p.id">
          {{ p.label }}（{{ p.year }}-{{ p.month }}-{{ p.day }}）
        </option>
      </select>
      <p v-else-if="useProfile" class="muted">暂无命例，可在下方填写并保存。</p>

      <template v-if="!useProfile">
        <SelectButton v-model="gender" :options="genderOptions" option-label="label" option-value="value" />
        <div class="row">
          <input v-model.number="year" class="input sm" type="number" min="1900" max="2100" />
          <input v-model.number="month" class="input sm" type="number" min="1" max="12" />
          <input v-model.number="day" class="input sm" type="number" min="1" max="31" />
        </div>
        <label class="check">
          <input v-model="hourUnknown" type="checkbox" />
          时辰未知
        </label>
        <input v-show="!hourUnknown" v-model.number="hour" class="input sm" type="number" min="0" max="23" />
      </template>

      <div class="actions">
        <button type="button" class="btn primary" @click="runDaily">刷新今日运势</button>
        <button v-if="!useProfile" type="button" class="btn ghost" @click="saveProfile">保存为命例</button>
      </div>
      <input v-if="!useProfile" v-model="saveLabel" class="input" placeholder="命例昵称" />
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="fortune" class="fortune-card">
      <div class="score-row">
        <span class="score">{{ fortune.score }}</span>
        <span class="band" :data-band="fortune.band">{{ fortune.band }}</span>
      </div>
      <p class="summary">{{ fortune.summary }}</p>
      <p class="meta">流日 {{ fortune.dayGz }}（{{ fortune.dayShiShen }}）· 流年 {{ fortune.yearGz }}（{{ fortune.yearShiShen }}）</p>

      <div class="aspects">
        <div v-for="a in fortune.aspects" :key="a.key" class="aspect">
          <div class="aspect-top">
            <span>{{ a.label }}</span>
            <strong>{{ a.score }}</strong>
          </div>
          <div class="bar"><i :style="{ width: a.score + '%' }" /></div>
          <p>{{ a.hint }}</p>
        </div>
      </div>

      <div class="do-avoid">
        <div>
          <h3>宜</h3>
          <ul>
            <li v-for="(x, i) in fortune.doList" :key="'d' + i">{{ x }}</li>
          </ul>
        </div>
        <div v-if="fortune.avoidList.length">
          <h3>忌</h3>
          <ul>
            <li v-for="(x, i) in fortune.avoidList" :key="'a' + i">{{ x }}</li>
          </ul>
        </div>
      </div>
      <p class="disclaimer">{{ fortune.disclaimer }}</p>
    </div>
  </section>
</template>

<style scoped>
.page {
  max-width: 720px;
  padding-bottom: 48px;
}

.page-head {
  margin-bottom: 20px;
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
}

.lead {
  margin: 12px 0 0;
  color: var(--ink-soft);
  line-height: 1.65;
}

.lunar {
  margin: 8px 0 0;
  font-size: 0.95rem;
  color: var(--teal);
}

.panel {
  background: var(--surface-solid);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 16px;
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
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
  margin-bottom: 8px;
}

.input.sm {
  flex: 1;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.btn {
  padding: 10px 20px;
  border-radius: 999px;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn.primary {
  background: var(--seal);
  color: #fff8f4;
}

.btn.ghost {
  border-color: var(--line);
  background: transparent;
}

.muted {
  color: var(--ink-soft);
  font-size: 0.9rem;
}

.fortune-card {
  background: var(--surface-solid);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 22px;
}

.score-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.score {
  font-size: 3.2rem;
  font-family: var(--font-brand);
  line-height: 1;
}

.band[data-band='高'] {
  color: var(--band-high);
}
.band[data-band='中'] {
  color: var(--band-mid);
}
.band[data-band='低'] {
  color: var(--band-low);
}

.summary {
  font-size: 1.05rem;
  line-height: 1.6;
  margin: 12px 0 8px;
}

.meta {
  font-size: 0.88rem;
  color: var(--ink-soft);
  margin: 0 0 20px;
}

.aspects {
  display: grid;
  gap: 14px;
  margin-bottom: 20px;
}

.aspect-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.bar {
  height: 6px;
  background: var(--line);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 6px;
}

.bar i {
  display: block;
  height: 100%;
  background: var(--teal);
  border-radius: 999px;
}

.aspect p {
  margin: 0;
  font-size: 0.88rem;
  color: var(--ink-soft);
  line-height: 1.5;
}

.do-avoid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 12px;
}

@media (max-width: 640px) {
  .do-avoid {
    grid-template-columns: 1fr;
  }
}

.do-avoid h3 {
  margin: 0 0 8px;
  font-size: 0.95rem;
}

.do-avoid ul {
  margin: 0;
  padding-left: 1.2em;
  line-height: 1.55;
}

.disclaimer {
  font-size: 0.82rem;
  color: var(--ink-soft);
  margin: 0;
}

.error {
  color: var(--seal);
}
</style>
