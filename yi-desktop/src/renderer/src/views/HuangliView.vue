<script setup lang="ts">
/**
 * 黄历页：日历选日 + 白话解读 + 传统宜忌明细。
 */
import { computed, onActivated, onMounted, ref } from 'vue'
import DatePicker from 'primevue/datepicker'
import { buildHuangliDay, formatHuangliFacts, type HuangliDay } from '@rules/huangli/day'
import {
  buildHuangliPlainRead,
  formatHuangliPlainFacts,
  type HuangliPlainRead
} from '@rules/huangli/plain'
import { scanZeJiDays, ZEJI_MATTERS, type ZeJiHit } from '@rules/huangli/zeji'
import { useAssistContextStore } from '../stores/assistContext'
import { getCurrentPosition } from '../utils/deviceLocation'

const assist = useAssistContextStore()

const now = new Date()
/** 日历选中日（与年/月/日数字双向同步） */
const pickedDate = ref<Date>(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
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
/** 同步锁：避免日历 ↔ 数字互踢 */
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
 * 按事项扫描吉日列表。
 */
function runZeJi(): void {
  zejiHits.value = scanZeJiDays(zejiMatterId.value, pickedDate.value, zejiDays.value)
}

/**
 * 点择吉结果跳到该日并刷新黄历。
 * @param hit 命中日
 */
function jumpZeJi(hit: ZeJiHit): void {
  const [y, m, d] = hit.solarLabel.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  syncing.value = true
  pickedDate.value = dt
  applyDateParts(dt)
  syncing.value = false
  run()
}

/**
 * 从 Date 同步到年/月/日数字框。
 * @param d 选中日期
 */
function applyDateParts(d: Date): void {
  year.value = d.getFullYear()
  month.value = d.getMonth() + 1
  day.value = d.getDate()
}

/**
 * 从年/月/日拼 Date；非法则返回 null。
 */
function partsToDate(): Date | null {
  const y = year.value
  const m = month.value
  const d = day.value
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const dt = new Date(y, m - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
  return dt
}

/**
 * 排当日黄历、生成白话，并 publish 到助手。
 */
function run(): void {
  errMsg.value = ''
  const dayData = buildHuangliDay(year.value, month.value, day.value)
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
 * 日历变更：同步数字并刷新。
 * @param v DatePicker 值
 */
function onCalendarChange(v: Date | Date[] | (Date | null)[] | null | undefined): void {
  const d = Array.isArray(v) ? v[0] : v
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return
  syncing.value = true
  pickedDate.value = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  applyDateParts(pickedDate.value)
  syncing.value = false
  run()
}

/**
 * 数字框变更：合法则回写日历并刷新。
 */
function onPartsChange(): void {
  if (syncing.value) return
  const dt = partsToDate()
  if (!dt) {
    errMsg.value = '日期不合法，请检查年/月/日'
    return
  }
  errMsg.value = ''
  syncing.value = true
  pickedDate.value = dt
  syncing.value = false
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
 * 切到今日并刷新。
 */
function goToday(): void {
  const t = new Date()
  const clean = new Date(t.getFullYear(), t.getMonth(), t.getDate())
  syncing.value = true
  pickedDate.value = clean
  applyDateParts(clean)
  syncing.value = false
  run()
}

/**
 * 进入本页时锁定黄历槽位（含 keep-alive 再激活）。
 */
function activateHuangli(): void {
  assist.setActiveFeature('huangli')
}

/** 日历面板内联展示，方便手机点选 */
const calendarInline = computed(() => true)

onMounted(() => {
  activateHuangli()
  run()
})

onActivated(() => {
  activateHuangli()
})
</script>

<template>
  <div class="page rise">
    <header class="head">
      <h1>黄历</h1>
      <p>点日历选日，先看白话解读；传统宜忌可对照原文。可选定位仅作展示。</p>
    </header>

    <div class="panel pick-panel">
      <div class="cal-block">
        <p class="cal-label">选日期</p>
        <!-- 月份/星期等文案走 main.ts 全局 zh-CN locale，勿在此硬编码英文 -->
        <DatePicker
          v-model="pickedDate"
          class="huangli-cal"
          date-format="yy-mm-dd"
          :inline="calendarInline"
          :show-other-months="true"
          :select-other-months="true"
          @update:model-value="onCalendarChange"
        />
      </div>

      <div class="parts-block">
        <div class="parts-row">
          <label>
            年
            <input v-model.number="year" type="number" min="1900" max="2100" @change="onPartsChange" />
          </label>
          <label>
            月
            <input v-model.number="month" type="number" min="1" max="12" @change="onPartsChange" />
          </label>
          <label>
            日
            <input v-model.number="day" type="number" min="1" max="31" @change="onPartsChange" />
          </label>
        </div>
        <div class="parts-actions">
          <button type="button" class="primary" @click="onPartsChange">查黄历</button>
          <button type="button" class="ghost" @click="goToday">今日</button>
          <button type="button" class="ghost" :disabled="locating" @click="locate">
            {{ locating ? '定位中…' : '可选定位' }}
          </button>
        </div>
        <p v-if="latitude != null" class="geo">
          定位 {{ latitude.toFixed(5) }}, {{ longitude?.toFixed(5) }}
          <template v-if="accuracy != null"> · 精度约 {{ Math.round(accuracy) }} 米</template>
        </p>
        <p v-if="errMsg" class="err">{{ errMsg }}</p>
      </div>
    </div>

    <!-- 按事项择吉 -->
    <section class="zeji panel">
      <h2 class="zeji-title">按事项择吉</h2>
      <p class="zeji-lead">从当前选中日起向后扫描，筛出「宜」含该事项的日子（教学参考，勿作唯一决策）。</p>
      <div class="zeji-row">
        <label>
          事项
          <select v-model="zejiMatterId">
            <option v-for="m in zejiOptions" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>
        </label>
        <label>
          向后天数
          <input v-model.number="zejiDays" type="number" min="7" max="120" />
        </label>
        <button type="button" class="primary" @click="runZeJi">筛吉日</button>
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
  </div>
</template>

<style scoped>
.head h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 2rem;
}
.head p {
  color: var(--ink-soft);
}
.pick-panel {
  margin-top: 18px;
  display: grid;
  grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
  gap: 18px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  align-items: start;
}
@media (max-width: 860px) {
  .pick-panel {
    grid-template-columns: 1fr;
  }
}
.cal-label {
  margin: 0 0 8px;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  color: var(--muted);
  font-weight: 600;
}
.huangli-cal {
  width: 100%;
}
.parts-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.parts-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
}
input {
  min-width: 4.5rem;
  padding: 6px 8px;
}
.geo {
  width: 100%;
  margin: 10px 0 0;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
.err {
  width: 100%;
  color: var(--seal);
  margin: 8px 0 0;
}
.plain-card {
  margin-top: 18px;
  padding: 18px 18px 14px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background:
    linear-gradient(160deg, color-mix(in srgb, var(--teal) 10%, transparent), transparent 45%),
    var(--surface-solid);
  box-shadow: var(--shadow);
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
  margin: 10px 0 16px;
  color: var(--ink-soft);
  line-height: 1.65;
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
}
.pbox {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface-strong);
}
.pbox.yi {
  border-color: color-mix(in srgb, var(--teal) 35%, var(--line));
  background: color-mix(in srgb, var(--teal) 8%, var(--surface-strong));
}
.pbox.ji {
  border-color: color-mix(in srgb, var(--seal) 30%, var(--line));
  background: color-mix(in srgb, var(--seal) 7%, var(--surface-strong));
}
.pbox h3 {
  margin: 0 0 8px;
  font-size: 0.95rem;
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
  gap: 10px;
}
.plain-kv > div {
  display: grid;
  grid-template-columns: 3.2rem 1fr;
  gap: 10px;
  padding: 8px 0;
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
.classic {
  margin-top: 16px;
  padding: 12px 14px;
  border: 1px dashed var(--line);
  border-radius: 14px;
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
.classic[open] summary {
  margin-bottom: 12px;
  color: var(--ink);
}
.classic h3 {
  margin: 0 0 6px;
  font-size: 1.05rem;
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
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
}
.box.yi {
  background: color-mix(in srgb, var(--teal) 10%, transparent);
}
.box.ji {
  background: color-mix(in srgb, var(--seal) 8%, transparent);
}
.box h4 {
  margin: 0 0 6px;
  font-size: 1rem;
}
.kv {
  display: grid;
  gap: 10px;
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
  padding: 12px;
  border-left: 3px solid var(--accent, #8b5a2b);
  color: var(--ink-soft);
  line-height: 1.6;
}
button.primary,
button.ghost {
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid var(--line);
  cursor: pointer;
}
button.primary {
  background: var(--teal);
  color: var(--on-accent);
  border-color: transparent;
}
button.ghost {
  background: transparent;
}
.zeji {
  margin-top: 16px;
}
.zeji-title {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: 1.15rem;
}
.zeji-lead {
  margin: 0 0 12px;
  color: var(--ink-soft);
  font-size: 0.88rem;
  line-height: 1.55;
}
.zeji-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
  margin-bottom: 12px;
}
.zeji-row label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
}
.zeji-row select,
.zeji-row input {
  min-height: var(--touch-min);
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--input-bg);
  color: var(--ink);
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
  gap: 2px;
  text-align: left;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface-strong);
  color: inherit;
  cursor: pointer;
  font: inherit;
}
.zeji-hit:hover {
  border-color: color-mix(in srgb, var(--teal) 40%, var(--line));
}
.zeji-date {
  font-weight: 700;
  color: var(--teal);
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
</style>

<style>
/* DatePicker 内联面板贴合主题 */
.huangli-cal.p-datepicker {
  width: 100%;
}
.huangli-cal .p-datepicker-panel {
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface-solid);
  color: var(--ink);
  box-shadow: none;
  width: 100%;
}
.huangli-cal .p-datepicker-header {
  background: color-mix(in srgb, var(--teal) 8%, var(--surface-solid));
  color: var(--ink);
  border-bottom: 1px solid var(--line);
}
.huangli-cal .p-datepicker-day.p-datepicker-day-selected {
  background: var(--teal);
  color: var(--on-accent);
}
</style>
