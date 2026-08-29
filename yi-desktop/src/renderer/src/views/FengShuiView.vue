<script setup lang="ts">
/**
 * 阳宅风水页：GPS/手填经纬度 + 罗盘坐向 + 八宅 + 年/月飞星 + 助手上下文。
 */
import { computed, onActivated, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { analyzeFengShui, type FengShuiResult } from '@rules/fengshui/analyze'
import { useBaziProfilesStore } from '../stores/baziProfiles'
import { useAssistContextStore } from '../stores/assistContext'
import {
  getCurrentPosition,
  requestCompassPermission,
  watchCompass
} from '../utils/deviceLocation'

const profilesStore = useBaziProfilesStore()
const { profiles, activeProfileId } = storeToRefs(profilesStore)
const assist = useAssistContextStore()

const year = ref(1990)
const month = ref(5)
const day = ref(1)
const gender = ref<'male' | 'female'>('male')
const headingDeg = ref(180)
/** 纬度：可定位写入，也可手填 */
const latitude = ref<number | null>(null)
/** 经度：可定位写入，也可手填 */
const longitude = ref<number | null>(null)
/** GPS 精度（米），手填时为空 */
const accuracy = ref<number | null>(null)
const locating = ref(false)
const compassOn = ref(false)
const result = ref<FengShuiResult | null>(null)
const errMsg = ref('')

let stopCompass: (() => void) | null = null

/**
 * 从活跃命例填充宅主信息。
 */
function loadProfile(): void {
  const p = profilesStore.byId(activeProfileId.value)
  if (!p) return
  year.value = p.year
  month.value = p.month
  day.value = p.day
  gender.value = p.gender
}

/**
 * 发布风水事实到命师助手（含年/月盘与定位摘要）。
 */
function publishAssist(): void {
  if (!result.value) return
  assist.publish({
    id: 'fengshui',
    title: '风水',
    factsText: result.value.bullets.join('\n')
  })
}

/**
 * 拉取 GPS，并写入精度；手填字段可被覆盖。
 */
async function locate(): Promise<void> {
  errMsg.value = ''
  locating.value = true
  try {
    const g = await getCurrentPosition()
    latitude.value = g.latitude
    longitude.value = g.longitude
    accuracy.value = g.accuracy ?? null
  } catch (e) {
    errMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    locating.value = false
  }
}

/**
 * 开关罗盘监听。
 */
async function toggleCompass(): Promise<void> {
  errMsg.value = ''
  if (compassOn.value) {
    stopCompass?.()
    stopCompass = null
    compassOn.value = false
    return
  }
  try {
    await requestCompassPermission()
    stopCompass = watchCompass((r) => {
      headingDeg.value = Math.round(r.headingDeg)
    })
    compassOn.value = true
  } catch (e) {
    errMsg.value = e instanceof Error ? e.message : String(e)
  }
}

/**
 * 推算并发布助手上下文。
 */
function run(): void {
  errMsg.value = ''
  result.value = analyzeFengShui({
    year: year.value,
    month: month.value,
    day: day.value,
    gender: gender.value,
    headingDeg: headingDeg.value,
    latitude: latitude.value ?? undefined,
    longitude: longitude.value ?? undefined,
    accuracy: accuracy.value ?? undefined
  })
  publishAssist()
}

const headingLabel = computed(() => `${headingDeg.value}°`)

/**
 * 手填经纬度时清空精度，避免误显示旧 GPS 精度。
 */
function onManualCoord(): void {
  accuracy.value = null
}

/**
 * 进入本页时锁定风水槽位（含 keep-alive 再激活）。
 */
function activateFengShui(): void {
  assist.setActiveFeature('fengshui')
}

onMounted(() => {
  activateFengShui()
  loadProfile()
})

onActivated(() => {
  activateFengShui()
})

onBeforeUnmount(() => {
  stopCompass?.()
})

loadProfile()
</script>

<template>
  <div class="page rise">
    <header class="head">
      <h1>阳宅风水</h1>
      <p>
        八宅游年叠流年/流月飞星；可定位或手填经纬度，罗盘取坐向。形峦实勘不在此列。
      </p>
    </header>

    <div class="panel">
      <label>
        命例
        <select
          :value="activeProfileId ?? ''"
          @change="
            profilesStore.setActive(($event.target as HTMLSelectElement).value || null);
            loadProfile()
          "
        >
          <option value="">手填</option>
          <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.label }}</option>
        </select>
      </label>
      <label>
        年
        <input v-model.number="year" type="number" min="1900" max="2100" />
      </label>
      <label>
        月
        <input v-model.number="month" type="number" min="1" max="12" />
      </label>
      <label>
        日
        <input v-model.number="day" type="number" min="1" max="31" />
      </label>
      <label>
        性别
        <select v-model="gender">
          <option value="male">男</option>
          <option value="female">女</option>
        </select>
      </label>
      <label>
        朝向角（向，正北=0）
        <input v-model.number="headingDeg" type="number" min="0" max="359" />
        <span class="hint">{{ headingLabel }}</span>
      </label>

      <div class="geo-block">
        <label>
          纬度
          <input
            v-model.number="latitude"
            type="number"
            step="0.00001"
            placeholder="可手填"
            @change="onManualCoord"
          />
        </label>
        <label>
          经度
          <input
            v-model.number="longitude"
            type="number"
            step="0.00001"
            placeholder="可手填"
            @change="onManualCoord"
          />
        </label>
        <p class="geo-meta">
          <template v-if="latitude != null && longitude != null">
            当前坐标 {{ Number(latitude).toFixed(5) }}, {{ Number(longitude).toFixed(5) }}
            <template v-if="accuracy != null"> · 精度约 {{ Math.round(accuracy) }} 米</template>
            <template v-else> · 手填/无精度</template>
          </template>
          <template v-else>尚未填写经纬度</template>
        </p>
        <button type="button" class="ghost" :disabled="locating" @click="locate">
          {{ locating ? '定位中…' : '使用定位' }}
        </button>
      </div>

      <button type="button" class="ghost" @click="toggleCompass">
        {{ compassOn ? '关闭罗盘' : '开启罗盘' }}
      </button>
      <button type="button" class="primary" @click="run">推算</button>
      <p v-if="errMsg" class="err">{{ errMsg }}</p>
    </div>

    <section v-if="result" class="result">
      <h2>
        坐{{ result.sittingFacing.sitting }}向{{ result.sittingFacing.facing }}
        <span class="soft"
          >（{{ result.sittingFacing.sittingGua }}/{{ result.sittingFacing.facingGua }}）</span
        >
      </h2>
      <p class="badge" :class="{ ok: result.houseMatch }">
        {{ result.houseMatch ? '宅命相配' : '宅命不同组' }} · 命卦{{ result.baZhai.mingGuaName }}（{{
          result.baZhai.group === 'east' ? '东四' : '西四'
        }}）
      </p>
      <ul class="hints">
        <li v-for="(b, i) in result.bullets" :key="i">{{ b }}</li>
      </ul>

      <h3>流年飞星 · {{ result.feixing.year }}（入中 {{ result.feixing.centerStar }}）</h3>
      <div class="fx-grid">
        <div v-for="c in result.feixing.cells" :key="'y' + c.key" class="fx-cell">
          <strong>{{ c.label }}{{ c.gua }}</strong>
          <span class="star">{{ c.star }}</span>
          <small>{{ c.tip }}</small>
        </div>
      </div>

      <h3>
        流月飞星 · {{ result.monthFeixing.year }}-{{ result.monthFeixing.month }}（入中
        {{ result.monthFeixing.centerStar }}）
      </h3>
      <div class="fx-grid">
        <div v-for="c in result.monthFeixing.cells" :key="'m' + c.key" class="fx-cell">
          <strong>{{ c.label }}{{ c.gua }}</strong>
          <span class="star">{{ c.star }}</span>
          <small>{{ c.tip }}</small>
        </div>
      </div>

      <h3>八宅方位卡</h3>
      <div class="grid">
        <div v-for="c in result.cards" :key="c.gua" class="cell" :class="c.baZhaiLuck">
          <strong>{{ c.gua }}</strong>
          <span>{{ c.baZhaiStar }} · {{ c.baZhaiLuck }}</span>
          <span v-if="c.yearStar" class="fx">流年{{ c.yearStar }}</span>
          <span v-if="c.monthStar" class="fx">流月{{ c.monthStar }}</span>
          <small>{{ c.tip }}</small>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.head h1 {
  margin: 0;
  font-family: var(--font-brand);
  font-size: clamp(1.75rem, 3vw, 2.1rem);
  letter-spacing: 0.08em;
}
.head p {
  color: var(--ink-soft);
  line-height: 1.65;
  max-width: 52em;
}
.panel {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 14px;
  align-items: end;
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface-solid);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--ink) 6%, transparent);
  width: 100%;
  box-sizing: border-box;
}
label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
input,
select {
  min-width: 5rem;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--input-bg);
  color: var(--ink);
  font-size: 16px;
}
.hint {
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.geo-block {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: end;
  padding: 14px;
  border-radius: 12px;
  border: 1px dashed var(--line);
  background: color-mix(in srgb, var(--teal) 6%, var(--surface-solid));
  box-sizing: border-box;
}
.geo-meta {
  width: 100%;
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink);
}
.err {
  width: 100%;
  color: var(--seal);
  margin: 0;
}
.result {
  margin-top: 20px;
  width: 100%;
}
.soft {
  color: var(--ink-soft);
  font-weight: 400;
  font-size: 0.9rem;
}
.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--gold) 18%, var(--surface-solid));
  color: var(--ink);
  font-size: 0.85rem;
  border: 1px solid color-mix(in srgb, var(--gold) 30%, transparent);
}
.badge.ok {
  background: color-mix(in srgb, var(--teal) 16%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--teal) 30%, transparent);
  color: var(--teal);
}
.hints {
  line-height: 1.7;
  color: var(--ink-soft);
}
h3 {
  margin: 18px 0 8px;
  font-size: 1.1rem;
  font-family: var(--font-display);
  color: var(--teal);
}
.fx-grid,
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin: 8px 0 16px;
  width: 100%;
}
.fx-cell,
.cell {
  padding: 14px 14px 12px;
  border-radius: 14px;
  border: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.88rem;
  background: var(--surface-strong);
  color: var(--ink);
  min-height: 108px;
  box-sizing: border-box;
}
.fx-cell .star {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--teal);
}
.cell.吉 {
  background: color-mix(in srgb, var(--teal) 16%, var(--surface-strong));
  border-color: color-mix(in srgb, var(--teal) 35%, var(--line));
}
.cell.次吉 {
  background: color-mix(in srgb, var(--teal) 8%, var(--surface-strong));
  border-color: color-mix(in srgb, var(--teal) 22%, var(--line));
}
.cell.凶,
.cell.次凶 {
  background: color-mix(in srgb, var(--seal) 12%, var(--surface-strong));
  border-color: color-mix(in srgb, var(--seal) 30%, var(--line));
}
.fx {
  color: var(--ink-soft);
}
.ai {
  white-space: pre-wrap;
  background: color-mix(in srgb, var(--ink) 4%, var(--surface-solid));
  padding: 12px;
  border-radius: 12px;
  line-height: 1.6;
  color: var(--ink);
}
button.primary,
button.ghost {
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid var(--line);
  cursor: pointer;
  min-height: var(--touch-min);
}
button.primary {
  background: var(--teal);
  color: var(--on-accent);
  border-color: transparent;
}
button.ghost {
  background: var(--surface);
  color: var(--ink);
}

@media (max-width: 720px) {
  .panel {
    flex-direction: column;
    align-items: stretch;
  }
  .panel label {
    width: 100%;
  }
  .panel input,
  .panel select {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  .fx-grid,
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .feixing-board {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .geo-row,
  .loc-fields {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
}
</style>
