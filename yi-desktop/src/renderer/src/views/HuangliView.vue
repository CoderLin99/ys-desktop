<script setup lang="ts">
/**
 * 黄历页：鼓轮选日（全宽展开）+ 白话解读 + 传统宜忌明细。
 * 日期区复用 BirthDatePicker，避免小卡片内嵌滚动日历。
 */
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import { Lunar } from 'lunar-javascript'
import { buildHuangliDay, formatHuangliFacts, type HuangliDay } from '@rules/huangli/day'
import {
  buildHuangliPlainRead,
  formatHuangliPlainFacts,
  type HuangliPlainRead
} from '@rules/huangli/plain'
import { scanZeJiDays, ZEJI_MATTERS, type ZeJiHit } from '@rules/huangli/zeji'
import BirthDatePicker, { type BirthCalendarKind } from '../components/BirthDatePicker.vue'
import { useAssistContextStore } from '../stores/assistContext'
import { getCurrentPosition } from '../utils/deviceLocation'

const assist = useAssistContextStore()

const now = new Date()
/** 历法：公历为主；选农历时推算前先换公历 */
const calendar = ref<BirthCalendarKind>('solar')
/** 年（随历法：公历年或农历年） */
const year = ref(now.getFullYear())
/** 月 1–12 */
const month = ref(now.getMonth() + 1)
/** 日 */
const day = ref(now.getDate())
const result = ref<HuangliDay | null>(null)
/** 白话解读 */
const plain = ref<HuangliPlainRead | null>(null)
/** 可选定位：黄历本身不依赖坐标，仅展示 */
const latitude = ref<number | null>(null)
const longitude = ref<number | null>(null)
const accuracy = ref<number | null>(null)
const locating = ref(false)
const errMsg = ref('')
/** 同步锁：避免鼓轮 ↔ 数字框互踢 */
const syncing = ref(false)
/** 择吉事项 id */
const zejiMatterId = ref(ZEJI_MATTERS[0]?.id ?? '婚嫁')
/** 择吉向后扫描天数 */
const zejiDays = ref(45)
/** 择吉结果 */
const zejiHits = ref<ZeJiHit[]>([])
/** 择吉事项选项 */
const zejiOptions = ZEJI_MATTERS

/**
 * 把表单年月日（可农历）换成排盘用公历。
 * @returns 公历年月日；非法则 null
 */
function resolveSolarYmd(): { year: number; month: number; day: number } | null {
  const y = year.value
  const m = month.value
  const d = day.value
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  if (calendar.value === 'solar') {
    const dt = new Date(y, m - 1, d)
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
    return { year: y, month: m, day: d }
  }
  try {
    const lu = Lunar.fromYmd(y, m, d)
    const s = lu.getSolar()
    return { year: s.getYear(), month: s.getMonth(), day: s.getDay() }
  } catch {
    return null
  }
}

/**
 * 顶栏大字摘要（公历优先展示实际查询日）。
 */
const dateHeroLabel = computed(() => {
  const solar = resolveSolarYmd()
  if (!solar) return `${year.value}年${month.value}月${day.value}日`
  return `${solar.year}年${solar.month}月${solar.day}日`
})

/**
 * 副标题：农历对照 / 干支等（有结果时用结果，否则提示）。
 */
const dateHeroSub = computed(() => {
  if (result.value) {
    const fest = [...result.value.festivals, ...result.value.otherFestivals]
    const festPart = fest.length ? ` · ${fest.slice(0, 2).join('、')}` : ''
    return `农历 ${result.value.lunarLabel} · ${result.value.dayGz}日${festPart}`
  }
  return calendar.value === 'solar' ? '公历选日 · 鼓轮滑动即查' : '农历选日 · 将自动换算公历'
})

/**
 * 节日标签列表（白话区展示）。
 */
const festivalTags = computed(() => {
  if (!result.value) return [] as string[]
  return [...result.value.festivals, ...result.value.otherFestivals]
})

/**
 * 按事项扫描吉日列表。
 */
function runZeJi(): void {
  const solar = resolveSolarYmd()
  if (!solar) {
    errMsg.value = '日期不合法，请检查年/月/日'
    return
  }
  const from = new Date(solar.year, solar.month - 1, solar.day)
  zejiHits.value = scanZeJiDays(zejiMatterId.value, from, zejiDays.value)
}

/**
 * 点择吉结果跳到该日并刷新黄历。
 * @param hit 命中日
 */
function jumpZeJi(hit: ZeJiHit): void {
  const [y, m, d] = hit.solarLabel.split('-').map(Number)
  syncing.value = true
  calendar.value = 'solar'
  year.value = y
  month.value = m
  day.value = d
  syncing.value = false
  run()
}

/**
 * 排当日黄历、生成白话，并 publish 到助手。
 */
function run(): void {
  errMsg.value = ''
  const solar = resolveSolarYmd()
  if (!solar) {
    errMsg.value = '日期不合法，请检查年/月/日'
    return
  }
  const dayData = buildHuangliDay(solar.year, solar.month, solar.day)
  result.value = dayData
  plain.value = buildHuangliPlainRead(dayData)
  const loc =
    latitude.value != null && longitude.value != null
      ? `\n定位（展示）：${latitude.value.toFixed(5)}, ${longitude.value.toFixed(5)}${
          accuracy.value != null ? ` · 约${Math.round(accuracy.value)}米` : ''
        }`
      : ''
  assist.publish({
    id: 'huangli',
    title: '黄历',
    factsText:
      formatHuangliFacts(dayData) +
      '\n\n' +
      formatHuangliPlainFacts(dayData, plain.value) +
      loc
  })
}

/**
 * 鼓轮或数字框变更后刷新（带同步锁）。
 */
function onDatePartsChange(): void {
  if (syncing.value) return
  run()
}

/**
 * 可选拉取 GPS，不参与黄历推算。
 */
async function locate(): Promise<void> {
  errMsg.value = ''
  locating.value = true
  try {
    const g = await getCurrentPosition()
    latitude.value = g.latitude
    longitude.value = g.longitude
    accuracy.value = g.accuracy ?? null
    if (result.value) run()
  } catch (e) {
    errMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    locating.value = false
  }
}

/**
 * 切到今日（公历）并刷新。
 */
function goToday(): void {
  const t = new Date()
  syncing.value = true
  calendar.value = 'solar'
  year.value = t.getFullYear()
  month.value = t.getMonth() + 1
  day.value = t.getDate()
  syncing.value = false
  run()
}

/**
 * 进入本页时锁定黄历槽位（含 keep-alive 再激活）。
 */
function activateHuangli(): void {
  assist.setActiveFeature('huangli')
}

/** 鼓轮变更时自动查历（历法切换也重算） */
watch([year, month, day, calendar], () => {
  if (syncing.value) return
  onDatePartsChange()
})

onMounted(() => {
  activateHuangli()
  run()
})

onActivated(() => {
  activateHuangli()
})
</script>

<template>
  <section class="page rise huangli">
    <header class="page-head">
      <p class="eyebrow">HUANGLI</p>
      <h1>黄历</h1>
      <p class="lead">鼓轮选日，先看白话宜忌；传统原文可对照。可选定位仅作展示，不参与推算。</p>
    </header>

    <!-- 日期区：全宽展开，不塞进可滚动小卡片 -->
    <section class="date-hero" aria-label="选择日期">
      <div class="date-hero-top">
        <div class="date-hero-copy">
          <p class="date-kicker">查询日期</p>
          <h2 class="date-big">{{ dateHeroLabel }}</h2>
          <p class="date-sub">{{ dateHeroSub }}</p>
        </div>
        <div class="date-hero-actions">
          <button type="button" class="btn-ghost" @click="goToday">今日</button>
          <button type="button" class="btn-ghost" :disabled="locating" @click="locate">
            {{ locating ? '定位中…' : '可选定位' }}
          </button>
        </div>
      </div>

      <!-- 鼓轮：占满合理宽度，滚动只发生在列内，非整卡嵌套滚动 -->
      <BirthDatePicker
        v-model:calendar="calendar"
        v-model:year="year"
        v-model:month="month"
        v-model:day="day"
        :show-hour="false"
      />

      <!-- 年月日数字框：清晰边框 + 墨金主题色，便于桌面精调 -->
      <div class="ymd-row" role="group" aria-label="年月日数字">
        <label class="ymd-field">
          <span class="ymd-lab">年</span>
          <input
            v-model.number="year"
            class="ymd-input"
            type="number"
            min="1900"
            max="2100"
            inputmode="numeric"
            @change="onDatePartsChange"
          />
        </label>
        <label class="ymd-field">
          <span class="ymd-lab">月</span>
          <input
            v-model.number="month"
            class="ymd-input"
            type="number"
            min="1"
            max="12"
            inputmode="numeric"
            @change="onDatePartsChange"
          />
        </label>
        <label class="ymd-field">
          <span class="ymd-lab">日</span>
          <input
            v-model.number="day"
            class="ymd-input"
            type="number"
            min="1"
            max="31"
            inputmode="numeric"
            @change="onDatePartsChange"
          />
        </label>
        <button type="button" class="btn-primary ymd-run" @click="run">查黄历</button>
      </div>

      <p v-if="latitude != null" class="geo">
        定位 {{ latitude.toFixed(5) }}, {{ longitude?.toFixed(5) }}
        <template v-if="accuracy != null"> · 精度约 {{ Math.round(accuracy) }} 米</template>
      </p>
      <p v-if="errMsg" class="err">{{ errMsg }}</p>
    </section>

    <!-- 按事项择吉 -->
    <section class="block zeji">
      <header class="block-head">
        <h2 class="block-title">按事项择吉</h2>
        <p class="block-lead">从当前日起向后扫描，「宜」含该事项的日子（教学参考，勿作唯一决策）。</p>
      </header>
      <div class="zeji-row">
        <label class="ctrl-field">
          <span class="ctrl-lab">事项</span>
          <select v-model="zejiMatterId" class="ctrl">
            <option v-for="m in zejiOptions" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>
        </label>
        <label class="ctrl-field">
          <span class="ctrl-lab">向后天数</span>
          <input v-model.number="zejiDays" class="ctrl" type="number" min="7" max="120" />
        </label>
        <button type="button" class="btn-primary" @click="runZeJi">筛吉日</button>
      </div>
      <ul v-if="zejiHits.length" class="zeji-list">
        <li v-for="h in zejiHits" :key="h.solarLabel">
          <button type="button" class="zeji-hit" @click="jumpZeJi(h)">
            <span class="zeji-date">{{ h.solarLabel }}</span>
            <span class="zeji-meta">{{ h.dayGz }} · {{ h.lunarLabel }}</span>
            <span class="zeji-yi">宜 {{ h.matchedYi.join('、') }}</span>
            <span class="zeji-plain">{{ h.plainTips.slice(0, 2).join('；') }}</span>
          </button>
        </li>
      </ul>
      <p v-else class="muted zeji-empty">点「筛吉日」查看候选；无结果时可换事项或加长天数。</p>
    </section>

    <section v-if="result && plain" class="result">
      <!-- 白话优先 -->
      <article class="plain-card">
        <p class="plain-eyebrow">白话解读</p>
        <h2 class="plain-head">{{ plain.headline }}</h2>
        <p class="plain-vibe">{{ plain.vibe }}</p>

        <div v-if="festivalTags.length" class="fest-row" aria-label="节日">
          <span v-for="f in festivalTags" :key="f" class="fest-chip">{{ f }}</span>
        </div>

        <div class="plain-yi-ji">
          <div class="pbox yi">
            <h3>今天适合</h3>
            <ul v-if="plain.yi.length">
              <li v-for="item in plain.yi" :key="'py' + item.raw">
                <strong>{{ item.raw }}</strong>
                <span>{{ item.plain }}</span>
              </li>
            </ul>
            <p v-else class="muted">—</p>
          </div>
          <div class="pbox ji">
            <h3>今天慎做</h3>
            <ul v-if="plain.ji.length">
              <li v-for="item in plain.ji" :key="'pj' + item.raw">
                <strong>{{ item.raw }}</strong>
                <span>{{ item.plain }}</span>
              </li>
            </ul>
            <p v-else class="muted">—</p>
          </div>
        </div>

        <dl class="plain-kv">
          <div>
            <dt>冲煞</dt>
            <dd>{{ plain.chongSha }}</dd>
          </div>
          <div>
            <dt>值神</dt>
            <dd>{{ plain.tianShen }}</dd>
          </div>
          <div>
            <dt>建除</dt>
            <dd>{{ plain.zhiXing }}</dd>
          </div>
          <div>
            <dt>星宿</dt>
            <dd>{{ plain.xiu }}</dd>
          </div>
          <div>
            <dt>彭祖</dt>
            <dd>{{ plain.pengZu }}</dd>
          </div>
          <div>
            <dt>方位</dt>
            <dd>{{ plain.direction }}</dd>
          </div>
        </dl>
        <p class="disclaimer">{{ plain.disclaimer }}</p>
      </article>

      <details class="classic">
        <summary>传统原文对照</summary>
        <h3>{{ result.solarLabel }}</h3>
        <p class="meta">农历 {{ result.lunarLabel }} · {{ result.shengXiao }}日</p>
        <p class="gz">
          年 {{ result.yearGz }}（{{ result.yearNaYin }}） · 月 {{ result.monthGz }}（{{
            result.monthNaYin
          }}） · 日 {{ result.dayGz }}（{{ result.dayNaYin }}）
        </p>

        <div class="yi-ji">
          <div class="box yi">
            <h4>宜</h4>
            <p>{{ result.yi.join('、') || '—' }}</p>
          </div>
          <div class="box ji">
            <h4>忌</h4>
            <p>{{ result.ji.join('、') || '—' }}</p>
          </div>
        </div>

        <dl class="kv">
          <div>
            <dt>冲煞</dt>
            <dd>冲 {{ result.chongDesc || result.chong }} · 煞 {{ result.sha }}</dd>
          </div>
          <div>
            <dt>值神</dt>
            <dd>{{ result.tianShen }}（{{ result.tianShenType }}/{{ result.tianShenLuck }}）</dd>
          </div>
          <div>
            <dt>建除</dt>
            <dd>{{ result.zhiXing }}</dd>
          </div>
          <div>
            <dt>二十八宿</dt>
            <dd>{{ result.xiu }}（{{ result.xiuLuck }}）</dd>
          </div>
          <div>
            <dt>吉神</dt>
            <dd>{{ result.jiShen.join('、') || '—' }}</dd>
          </div>
          <div>
            <dt>凶煞</dt>
            <dd>{{ result.xiongSha.join('、') || '—' }}</dd>
          </div>
          <div>
            <dt>彭祖百忌</dt>
            <dd>{{ result.pengZuGan }}；{{ result.pengZuZhi }}</dd>
          </div>
          <div>
            <dt>方位</dt>
            <dd>
              喜神{{ result.posXi }} · 福神{{ result.posFu }} · 财神{{ result.posCai }} · 阳贵{{
                result.posYangGui
              }}
              · 阴贵{{ result.posYinGui }}
            </dd>
          </div>
          <div v-if="result.nineStar">
            <dt>九星</dt>
            <dd>{{ result.nineStar }}</dd>
          </div>
          <div v-if="result.festivals.length || result.otherFestivals.length">
            <dt>节日</dt>
            <dd>
              {{ [...result.festivals, ...result.otherFestivals].join('、') || '—' }}
            </dd>
          </div>
        </dl>

        <blockquote v-if="result.xiuSong" class="song">{{ result.xiuSong }}</blockquote>
      </details>
    </section>
  </section>
</template>

<style scoped>
.huangli {
  max-width: 920px;
}

/* —— 页头 —— */
.page-head {
  margin-bottom: 20px;
}
.eyebrow {
  margin: 0 0 8px;
  font-size: 0.72rem;
  letter-spacing: 0.28em;
  color: var(--teal);
  font-weight: 700;
}
.page-head h1 {
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

/* —— 日期英雄区：全宽、不嵌套滚动 —— */
.date-hero {
  display: grid;
  gap: 14px;
  padding: 18px 18px 16px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--gold) 32%, var(--line));
  background:
    radial-gradient(ellipse 75% 70% at 0% 0%, color-mix(in srgb, var(--teal) 12%, transparent), transparent 55%),
    radial-gradient(ellipse 50% 60% at 100% 100%, color-mix(in srgb, var(--gold) 10%, transparent), transparent 50%),
    var(--surface-solid);
  box-shadow: 0 10px 28px color-mix(in srgb, var(--ink) 7%, transparent);
}
.date-hero-top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.date-kicker {
  margin: 0 0 4px;
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  color: var(--muted);
  font-weight: 600;
}
.date-big {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.35rem, 3.5vw, 1.75rem);
  letter-spacing: 0.06em;
  color: var(--ink);
  line-height: 1.3;
}
.date-sub {
  margin: 6px 0 0;
  font-size: 0.86rem;
  color: var(--ink-soft);
  line-height: 1.5;
}
.date-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* BirthDatePicker 融入英雄区：避免双层卡片套娃，鼓轮列内滚动保留 */
.date-hero :deep(.birth-date) {
  padding: 4px 0 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.date-hero :deep(.drum) {
  /* 鼓轮区略抬高，桌面/手机都一眼能点满列，无需再缩进小卡片 */
  min-height: 168px;
}
.date-hero :deep(.wheel) {
  height: 168px;
}
@media (max-width: 520px) {
  .date-hero :deep(.wheel) {
    height: 148px;
  }
}

/* 年月日数字框：明确边框 + 主题色聚焦 */
.ymd-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
}
.ymd-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1 1 5.5rem;
  min-width: 5rem;
  max-width: 8rem;
}
.ymd-lab {
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  color: var(--muted);
  font-weight: 600;
}
.ymd-input {
  width: 100%;
  min-height: var(--touch-min);
  box-sizing: border-box;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1.5px solid color-mix(in srgb, var(--gold) 40%, var(--line));
  background: var(--input-bg);
  color: var(--ink);
  font: inherit;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}
.ymd-input:hover {
  border-color: color-mix(in srgb, var(--teal) 45%, var(--line));
}
.ymd-input:focus {
  border-color: var(--teal);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--teal) 22%, transparent),
    inset 0 0 0 1px color-mix(in srgb, var(--gold) 25%, transparent);
  background: color-mix(in srgb, var(--teal) 5%, var(--input-bg));
}
.ymd-run {
  flex: 0 0 auto;
  min-height: var(--touch-min);
}

/* 按钮 */
.btn-primary,
.btn-ghost {
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid var(--line);
  cursor: pointer;
  font: inherit;
  min-height: var(--touch-min);
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    transform 0.12s ease;
}
.btn-primary {
  background: linear-gradient(135deg, var(--teal), color-mix(in srgb, var(--teal) 72%, var(--gold)));
  color: var(--on-accent);
  border-color: transparent;
  font-weight: 700;
  letter-spacing: 0.06em;
  box-shadow: 0 6px 16px color-mix(in srgb, var(--teal) 28%, transparent);
}
.btn-primary:hover {
  filter: brightness(1.05);
}
.btn-primary:active {
  transform: translateY(1px);
}
.btn-ghost {
  background: color-mix(in srgb, var(--surface-strong) 80%, transparent);
  color: var(--ink);
  border-color: color-mix(in srgb, var(--gold) 28%, var(--line));
}
.btn-ghost:hover:not(:disabled) {
  border-color: var(--teal);
  color: var(--teal);
}
.btn-ghost:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.geo {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
.err {
  margin: 0;
  color: var(--seal);
  font-size: 0.9rem;
}

/* —— 通用区块 —— */
.block {
  margin-top: 18px;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--surface-solid);
  box-shadow: 0 8px 22px color-mix(in srgb, var(--ink) 5%, transparent);
}
.block-head {
  margin-bottom: 12px;
}
.block-title {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: 1.15rem;
  letter-spacing: 0.08em;
}
.block-lead {
  margin: 0;
  color: var(--ink-soft);
  font-size: 0.88rem;
  line-height: 1.55;
}

.ctrl-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 0.85rem;
}
.ctrl-lab {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  color: var(--muted);
  font-weight: 600;
}
.ctrl {
  min-height: var(--touch-min);
  padding: 8px 12px;
  border-radius: 12px;
  border: 1.5px solid color-mix(in srgb, var(--gold) 36%, var(--line));
  background: var(--input-bg);
  color: var(--ink);
  font: inherit;
  outline: none;
}
.ctrl:focus {
  border-color: var(--teal);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--teal) 20%, transparent);
}

.zeji-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
  margin-bottom: 12px;
}
.zeji-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.zeji-hit {
  width: 100%;
  display: grid;
  gap: 3px;
  text-align: left;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface-strong);
  color: inherit;
  cursor: pointer;
  font: inherit;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.zeji-hit:hover {
  border-color: color-mix(in srgb, var(--teal) 40%, var(--line));
  background: color-mix(in srgb, var(--teal) 6%, var(--surface-strong));
}
.zeji-date {
  font-weight: 700;
  color: var(--teal);
  letter-spacing: 0.04em;
}
.zeji-meta,
.zeji-plain {
  font-size: 0.82rem;
  color: var(--ink-soft);
}
.zeji-yi {
  font-size: 0.85rem;
}
.zeji-empty {
  margin: 0;
  font-size: 0.88rem;
}

/* —— 白话结果 —— */
.plain-card {
  margin-top: 18px;
  padding: 20px 18px 16px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--gold) 26%, var(--line));
  background:
    linear-gradient(160deg, color-mix(in srgb, var(--teal) 11%, transparent), transparent 48%),
    var(--surface-solid);
  box-shadow: 0 10px 28px color-mix(in srgb, var(--ink) 6%, transparent);
}
.plain-eyebrow {
  margin: 0 0 6px;
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  color: var(--teal);
  font-weight: 700;
}
.plain-head {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.25rem;
  letter-spacing: 0.04em;
  line-height: 1.35;
}
.plain-vibe {
  margin: 10px 0 14px;
  color: var(--ink-soft);
  line-height: 1.65;
}
.fest-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 14px;
}
.fest-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  color: var(--seal);
  border: 1px solid color-mix(in srgb, var(--seal) 35%, var(--line));
  background: color-mix(in srgb, var(--seal) 8%, transparent);
}
.plain-yi-ji {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 640px) {
  .plain-yi-ji {
    grid-template-columns: 1fr;
  }
  .ymd-field {
    max-width: none;
    flex: 1 1 calc(33.33% - 10px);
  }
  .ymd-run {
    flex: 1 1 100%;
  }
}
.pbox {
  padding: 14px 14px 12px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--surface-strong);
}
.pbox.yi {
  border-color: color-mix(in srgb, var(--teal) 38%, var(--line));
  background: color-mix(in srgb, var(--teal) 9%, var(--surface-strong));
}
.pbox.ji {
  border-color: color-mix(in srgb, var(--seal) 32%, var(--line));
  background: color-mix(in srgb, var(--seal) 8%, var(--surface-strong));
}
.pbox h3 {
  margin: 0 0 10px;
  font-family: var(--font-display);
  font-size: 0.98rem;
  letter-spacing: 0.06em;
}
.pbox.yi h3 {
  color: var(--teal);
}
.pbox.ji h3 {
  color: var(--seal);
}
.pbox ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}
.pbox li {
  display: grid;
  gap: 2px;
  line-height: 1.45;
}
.pbox li strong {
  font-size: 0.88rem;
  color: var(--ink);
}
.pbox li span {
  font-size: 0.82rem;
  color: var(--ink-soft);
}
.muted {
  margin: 0;
  color: var(--muted);
}
.plain-kv {
  margin: 14px 0 0;
  display: grid;
  gap: 0;
}
.plain-kv > div {
  display: grid;
  grid-template-columns: 3.2rem 1fr;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}
.plain-kv dt {
  color: var(--teal);
  font-size: 0.82rem;
  font-weight: 600;
}
.plain-kv dd {
  margin: 0;
  line-height: 1.55;
  color: var(--ink-soft);
  font-size: 0.9rem;
}
.disclaimer {
  margin: 12px 0 0;
  font-size: 0.78rem;
  color: var(--muted);
  line-height: 1.5;
}

/* —— 传统原文 —— */
.classic {
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px dashed color-mix(in srgb, var(--gold) 30%, var(--line));
  border-radius: 16px;
  background: color-mix(in srgb, var(--surface) 70%, transparent);
}
.classic summary {
  cursor: pointer;
  font-family: var(--font-display);
  letter-spacing: 0.08em;
  color: var(--ink-soft);
  list-style: none;
}
.classic summary::-webkit-details-marker {
  display: none;
}
.classic summary::before {
  content: '▸ ';
  color: var(--gold);
}
.classic[open] summary {
  margin-bottom: 12px;
  color: var(--ink);
}
.classic[open] summary::before {
  content: '▾ ';
}
.classic h3 {
  margin: 0 0 6px;
  font-size: 1.05rem;
  font-family: var(--font-display);
}
.meta,
.gz {
  color: var(--ink-soft);
  line-height: 1.6;
}
.yi-ji {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 16px 0;
}
@media (max-width: 640px) {
  .yi-ji {
    grid-template-columns: 1fr;
  }
}
.box {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--line);
}
.box.yi {
  background: color-mix(in srgb, var(--teal) 10%, transparent);
  border-color: color-mix(in srgb, var(--teal) 28%, var(--line));
}
.box.ji {
  background: color-mix(in srgb, var(--seal) 8%, transparent);
  border-color: color-mix(in srgb, var(--seal) 26%, var(--line));
}
.box h4 {
  margin: 0 0 6px;
  font-size: 1rem;
  font-family: var(--font-display);
}
.kv {
  display: grid;
  gap: 0;
}
.kv > div {
  display: grid;
  grid-template-columns: 6rem 1fr;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
}
.kv dt {
  color: var(--ink-soft);
  font-size: 0.85rem;
}
.kv dd {
  margin: 0;
  line-height: 1.55;
}
.song {
  margin: 16px 0 0;
  padding: 12px 14px;
  border-left: 3px solid var(--gold);
  border-radius: 0 10px 10px 0;
  color: var(--ink-soft);
  line-height: 1.6;
  background: color-mix(in srgb, var(--gold) 6%, transparent);
}
</style>
