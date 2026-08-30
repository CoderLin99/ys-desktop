<script setup lang="ts">
/**
 * 紫微斗数完整排盘页：十二宫主星/辅星/四化、生年四化、大限，并发布助手上下文。
 */
import { onActivated, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { buildZiWeiChart, formatZiWeiFacts, type ZiWeiChart } from '@rules/ziwei/chart'
import { useBaziProfilesStore } from '../stores/baziProfiles'
import { useAssistContextStore } from '../stores/assistContext'

const profilesStore = useBaziProfilesStore()
const { profiles, activeProfileId } = storeToRefs(profilesStore)
const assist = useAssistContextStore()

const year = ref(1990)
const month = ref(5)
const day = ref(1)
const hour = ref<number | null>(12)
const gender = ref<'male' | 'female'>('male')
const chart = ref<ZiWeiChart | null>(null)

/**
 * 载入命例到表单，便于与八字共用同一出生资料。
 */
function loadProfile(): void {
  const p = profilesStore.byId(activeProfileId.value)
  if (!p) return
  year.value = p.year
  month.value = p.month
  day.value = p.day
  hour.value = p.hourUnknown ? null : p.hour
  gender.value = p.gender
}

/**
 * 把当前盘发布到命师助手（槽位独立，换页不 clear）。
 */
function publishAssist(): void {
  if (!chart.value) return
  assist.publish({
    id: 'ziwei',
    title: '紫微',
    factsText: formatZiWeiFacts(chart.value)
  })
}

/**
 * 排盘并同步助手上下文。
 */
function run(): void {
  chart.value = buildZiWeiChart({
    year: year.value,
    month: month.value,
    day: day.value,
    hour: hour.value,
    gender: gender.value
  })
  publishAssist()
}

/**
 * 星曜展示文案：四化用方括号标注，便于扫盘。
 * @param name 星名
 * @param sihua 四化名（可空）
 */
function starLabel(name: string, sihua?: string): string {
  return `${name}${sihua ? `[${sihua}]` : ''}`
}

/**
 * 进入本页时锁定紫微槽位（含 keep-alive 再激活）。
 */
function activateZiWei(): void {
  assist.setActiveFeature('ziwei')
}

onMounted(() => {
  activateZiWei()
  loadProfile()
})

onActivated(() => {
  activateZiWei()
})

loadProfile()
</script>

<template>
  <div class="page rise">
    <header class="head">
      <h1>紫微斗数</h1>
      <p>十二宫主星、常用辅星、生年四化与大限完整排盘；可复用命例，排盘后可用右下角命师助手解答。</p>
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
      <label>年 <input v-model.number="year" type="number" /></label>
      <label>月 <input v-model.number="month" type="number" min="1" max="12" /></label>
      <label>日 <input v-model.number="day" type="number" min="1" max="31" /></label>
      <label>
        时
        <input v-model.number="hour" type="number" min="0" max="23" placeholder="未知可空" />
      </label>
      <label>
        性别
        <select v-model="gender">
          <option value="male">男</option>
          <option value="female">女</option>
        </select>
      </label>
      <button type="button" class="primary" @click="run">排盘</button>
    </div>

    <section v-if="chart" class="result">
      <h2>{{ chart.lunarLabel }}</h2>
      <p class="meta">
        年柱 {{ chart.yearGanZhi }} · 命宫{{ chart.mingZhi }} · 身宫{{ chart.shenZhi }} ·
        {{ chart.wuXingJu }}
      </p>
      <ul class="hints">
        <li v-for="(h, i) in chart.hints" :key="i">{{ h }}</li>
      </ul>

      <h3>生年四化</h3>
      <ul class="sihua">
        <li v-for="s in chart.sihua" :key="s.kind">
          <strong>{{ s.kind }}</strong>{{ s.star }} → {{ s.palace }}（{{ s.zhi }}）
        </li>
      </ul>

      <h3>十二宫</h3>
      <div class="board">
        <div
          v-for="p in chart.palaces"
          :key="p.name"
          class="palace"
          :class="{ shen: p.isShen, ming: p.name === '命宫' }"
        >
          <header>
            <strong>{{ p.name }}</strong>
            <span>{{ p.gan }}{{ p.zhi }}</span>
          </header>
          <p class="stars majors">
            <template v-if="p.stars.filter((s) => s.major).length">
              <span
                v-for="s in p.stars.filter((x) => x.major)"
                :key="'m' + s.name"
                class="star major"
                :class="{ sihua: Boolean(s.sihua) }"
              >
                {{ starLabel(s.name, s.sihua) }}
              </span>
            </template>
            <span v-else class="empty">主星空</span>
          </p>
          <p v-if="p.minors.length" class="stars minors">
            <span
              v-for="s in p.stars.filter((x) => !x.major)"
              :key="'n' + s.name"
              class="star minor"
              :class="{ sihua: Boolean(s.sihua) }"
            >
              {{ starLabel(s.name, s.sihua) }}
            </span>
          </p>
          <p class="dx">大限 {{ p.daXianFrom }}–{{ p.daXianTo }} 岁</p>
          <span v-if="p.isShen" class="tag">身</span>
        </div>
      </div>

      <h3>大限（前 8 步）</h3>
      <div class="scroll-x">
        <table class="daxian">
          <thead>
            <tr>
              <th>岁数</th>
              <th>宫</th>
              <th>地支</th>
              <th>主星</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in chart.daXian.slice(0, 8)" :key="i">
              <td>{{ d.ageFrom }}–{{ d.ageTo }}</td>
              <td>{{ d.palace }}</td>
              <td>{{ d.zhi }}</td>
              <td>{{ d.majors.join('、') || '空' }}</td>
            </tr>
          </tbody>
        </table>
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
  min-width: 4.5rem;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--input-bg);
  color: var(--ink);
  font-size: 16px;
}
.meta {
  color: var(--ink-soft);
}
.hints,
.sihua {
  line-height: 1.7;
  color: var(--ink-soft);
}
h3 {
  margin: 18px 0 8px;
  font-size: 1.1rem;
  font-family: var(--font-display);
  color: var(--teal);
}
.board {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0;
  width: 100%;
}
@media (max-width: 1100px) {
  .board {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 720px) {
  .board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
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
  .daxian {
    display: block;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .daxian table,
  table.daxian {
    min-width: 420px;
  }
}
.palace {
  position: relative;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px 12px 28px;
  min-height: 148px;
  background: var(--surface-strong);
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 8%, transparent);
}
.palace.ming {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, var(--surface-strong));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent);
}
.palace header {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--ink);
  font-weight: 600;
}
.stars {
  margin: 8px 0 0;
  font-size: 0.9rem;
  line-height: 1.45;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  color: var(--ink);
}
.stars.minors {
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.star.sihua {
  color: var(--accent);
  font-weight: 700;
}
.dx {
  margin: 8px 0 0;
  font-size: 0.72rem;
  color: var(--ink-soft);
}
.empty {
  color: var(--ink-soft);
}
.tag {
  position: absolute;
  right: 8px;
  bottom: 6px;
  font-size: 0.75rem;
  color: var(--ink-soft);
}
.daxian {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  margin-bottom: 16px;
}
.daxian th,
.daxian td {
  border: 1px solid var(--line);
  padding: 8px 10px;
  text-align: left;
  color: var(--ink);
}
.daxian th {
  background: color-mix(in srgb, var(--teal) 10%, var(--surface-solid));
  color: var(--ink-soft);
}
.ai {
  white-space: pre-wrap;
  background: color-mix(in srgb, var(--ink) 4%, var(--surface-solid));
  padding: 12px;
  border-radius: 12px;
  color: var(--ink);
}
button.primary {
  padding: 10px 16px;
  border-radius: 10px;
  border: none;
  background: var(--teal);
  color: var(--on-accent);
  cursor: pointer;
  min-height: var(--touch-min);
}
.result {
  margin-top: 20px;
  width: 100%;
}
</style>
