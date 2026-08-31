<script setup lang="ts">
/**
 * 出生日期滑动选择：公历 / 农历切换 + 年/月/日/时滚轮。
 * 农历月用 1–12；时 null 表示未知。
 */
import { computed, watch } from 'vue'
import { Lunar, Solar } from 'lunar-javascript'

export type BirthCalendarKind = 'solar' | 'lunar'

const props = withDefaults(
  defineProps<{
    /** 公历 / 农历 */
    calendar?: BirthCalendarKind
    year: number
    month: number
    day: number
    /** 小时 0–23；null 表示未知 */
    hour?: number | null
    /** 是否显示时辰列 */
    showHour?: boolean
    minYear?: number
    maxYear?: number
  }>(),
  {
    calendar: 'solar',
    hour: 12,
    showHour: true,
    minYear: 1900,
    maxYear: 2100
  }
)

const emit = defineEmits<{
  'update:calendar': [BirthCalendarKind]
  'update:year': [number]
  'update:month': [number]
  'update:day': [number]
  'update:hour': [number | null]
}>()

const cal = computed({
  get: () => props.calendar,
  set: (v: BirthCalendarKind) => emit('update:calendar', v)
})

/** 年列表 */
const years = computed(() => {
  const list: number[] = []
  for (let y = props.maxYear; y >= props.minYear; y--) list.push(y)
  return list
})

/** 月列表 */
const months = computed(() => {
  const list: { v: number; label: string }[] = []
  for (let m = 1; m <= 12; m++) {
    list.push({
      v: m,
      label: cal.value === 'lunar' ? `农${m}月` : `${m}月`
    })
  }
  return list
})

/** 日列表 */
const days = computed(() => {
  let max = 30
  try {
    if (cal.value === 'solar') {
      max = daysInSolar(props.year, props.month)
    } else {
      max = 30
      for (let d = 30; d >= 27; d--) {
        try {
          Lunar.fromYmd(props.year, props.month, d)
          max = d
          break
        } catch {
          /* 继续 */
        }
      }
    }
  } catch {
    max = cal.value === 'solar' ? daysInSolar(props.year, props.month) : 30
  }
  const list: number[] = []
  for (let d = 1; d <= max; d++) list.push(d)
  return list
})

/** 时：未知 + 0–23 */
const hours = computed(() => {
  const list: { v: number | null; label: string }[] = [{ v: null, label: '未知' }]
  for (let h = 0; h <= 23; h++) list.push({ v: h, label: `${String(h).padStart(2, '0')}时` })
  return list
})

/**
 * 公历月天数。
 * @param y 年
 * @param m 月
 */
function daysInSolar(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

/**
 * 滚轮变更。
 * @param field 字段
 * @param raw select 值
 */
function onPick(field: 'year' | 'month' | 'day' | 'hour', raw: string): void {
  if (field === 'hour') {
    emit('update:hour', raw === '' || raw === 'null' ? null : Number(raw))
    return
  }
  const n = Number(raw)
  if (field === 'year') emit('update:year', n)
  if (field === 'month') emit('update:month', n)
  if (field === 'day') emit('update:day', n)
}

/** 对照文案 */
const mirrorHint = computed(() => {
  try {
    if (cal.value === 'solar') {
      const s = Solar.fromYmd(props.year, props.month, props.day)
      const l = s.getLunar()
      return `农历对照 · ${l.getYear()}年${l.getMonthInChinese()}月${l.getDayInChinese()}`
    }
    const l = Lunar.fromYmd(props.year, props.month, props.day)
    const s = l.getSolar()
    return `公历对照 · ${s.getYear()}-${String(s.getMonth()).padStart(2, '0')}-${String(s.getDay()).padStart(2, '0')}`
  } catch {
    return '日期无效，请调整月日'
  }
})

/** 顶栏摘要 */
const summary = computed(() => {
  const h = props.hour == null ? '时未知' : `${String(props.hour).padStart(2, '0')}时`
  if (cal.value === 'lunar') {
    return `农历 ${props.year}年${props.month}月${props.day}日 · ${h}`
  }
  return `公历 ${props.year}-${String(props.month).padStart(2, '0')}-${String(props.day).padStart(2, '0')} · ${h}`
})

watch(days, (list) => {
  if (list.length && props.day > list.length) emit('update:day', list.length)
})
</script>

<template>
  <div class="birth-date">
    <div class="bd-head">
      <div class="cal-switch" role="group" aria-label="历法">
        <button type="button" :class="{ on: cal === 'solar' }" @click="cal = 'solar'">公历</button>
        <button type="button" :class="{ on: cal === 'lunar' }" @click="cal = 'lunar'">农历</button>
      </div>
      <p class="summary">{{ summary }}</p>
    </div>
    <p class="hint">
      请确认填的是<strong>{{ cal === 'solar' ? '公历 / 新历' : '农历' }}</strong>，下方列可滑动选取。
    </p>

    <div class="drum" :class="{ 'no-hour': !showHour }">
      <div class="drum-glow" aria-hidden="true" />
      <div class="drum-center" aria-hidden="true" />
      <label class="col">
        <span class="lab">年</span>
        <select
          class="wheel"
          size="5"
          :value="year"
          @change="onPick('year', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </label>
      <label class="col">
        <span class="lab">月</span>
        <select
          class="wheel"
          size="5"
          :value="month"
          @change="onPick('month', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="m in months" :key="m.v" :value="m.v">{{ m.label }}</option>
        </select>
      </label>
      <label class="col">
        <span class="lab">日</span>
        <select
          class="wheel"
          size="5"
          :value="day"
          @change="onPick('day', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="d in days" :key="d" :value="d">{{ d }}日</option>
        </select>
      </label>
      <label v-if="showHour" class="col">
        <span class="lab">时</span>
        <select
          class="wheel"
          size="5"
          :value="hour == null ? 'null' : hour"
          @change="onPick('hour', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="h in hours" :key="String(h.v)" :value="h.v == null ? 'null' : h.v">
            {{ h.label }}
          </option>
        </select>
      </label>
    </div>

    <p class="mirror">{{ mirrorHint }}</p>
  </div>
</template>

<style scoped>
.birth-date {
  display: grid;
  gap: 10px;
  width: 100%;
  padding: 12px 12px 10px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--gold) 28%, var(--line));
  background:
    radial-gradient(ellipse 80% 60% at 0% 0%, color-mix(in srgb, var(--teal) 10%, transparent), transparent 55%),
    var(--surface-solid);
  box-shadow: 0 8px 22px color-mix(in srgb, var(--ink) 6%, transparent);
}
.bd-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.cal-switch {
  display: inline-flex;
  padding: 3px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 6%, var(--surface-strong));
  border: 1px solid var(--line);
}
.cal-switch button {
  border: none;
  background: transparent;
  color: var(--ink-soft);
  padding: 7px 16px;
  font: inherit;
  cursor: pointer;
  min-height: 34px;
  border-radius: 999px;
  letter-spacing: 0.08em;
  transition:
    background 0.18s ease,
    color 0.18s ease;
}
.cal-switch button.on {
  background: linear-gradient(135deg, var(--teal), color-mix(in srgb, var(--teal) 70%, var(--gold)));
  color: var(--on-accent);
  font-weight: 700;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--teal) 35%, transparent);
}
.summary {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.88rem;
  color: var(--ink);
  letter-spacing: 0.04em;
}
.hint {
  margin: 0;
  font-size: 0.78rem;
  color: var(--ink-soft);
  line-height: 1.45;
}
.hint strong {
  color: var(--teal);
}
.drum {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  padding: 8px 6px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--paper-deep) 55%, var(--surface-solid));
  border: 1px solid var(--line);
  overflow: hidden;
}
.drum.no-hour {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.drum-glow {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--surface-solid) 88%, transparent) 0%,
    transparent 28%,
    transparent 72%,
    color-mix(in srgb, var(--surface-solid) 88%, transparent) 100%
  );
  z-index: 2;
}
.drum-center {
  pointer-events: none;
  position: absolute;
  left: 6px;
  right: 6px;
  top: 50%;
  height: 34px;
  margin-top: -5px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--teal) 35%, transparent);
  background: color-mix(in srgb, var(--teal) 8%, transparent);
  z-index: 1;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 18%, transparent);
}
.col {
  position: relative;
  z-index: 3;
  display: grid;
  gap: 4px;
  min-width: 0;
}
.lab {
  text-align: center;
  font-size: 0.68rem;
  color: var(--muted);
  letter-spacing: 0.14em;
}
.wheel {
  width: 100%;
  height: 150px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 0.95rem;
  text-align: center;
  outline: none;
  cursor: pointer;
  /* 隐藏滚动条观感更干净 */
  scrollbar-width: none;
}
.wheel::-webkit-scrollbar {
  display: none;
}
.wheel option {
  padding: 6px 0;
  text-align: center;
}
.wheel:focus {
  background: color-mix(in srgb, var(--teal) 6%, transparent);
}
.mirror {
  margin: 0;
  padding: 6px 10px;
  border-radius: 999px;
  width: fit-content;
  max-width: 100%;
  font-size: 0.76rem;
  color: var(--ink-soft);
  background: color-mix(in srgb, var(--gold) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--gold) 28%, transparent);
}
@media (max-width: 520px) {
  .drum {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .drum.no-hour {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .wheel {
    height: 132px;
    font-size: 0.9rem;
  }
}
</style>
