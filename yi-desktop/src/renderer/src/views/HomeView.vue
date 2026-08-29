<script setup lang="ts">
/**
 * 首页：命理工作台入口 + 活跃命例今日运势摘要；发布用法助手上下文。
 */
import { computed, onActivated, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import appIcon from '../assets/app-icon.png'
import { buildBaZi } from '@rules/bazi/chart'
import { buildDailyFortune, lunarLabelOf } from '@rules/bazi/dailyFortune'
import { buildHomeAssistFacts } from '@rules/guide/appUsage'
import { useBaziProfilesStore } from '../stores/baziProfiles'
import { useAssistContextStore } from '../stores/assistContext'

const profilesStore = useBaziProfilesStore()
const { profiles, activeProfileId } = storeToRefs(profilesStore)
const assist = useAssistContextStore()

/**
 * 发布首页用法材料，使右下角助手可点。
 */
function publishHomeAssist(): void {
  assist.setActiveFeature('home')
  assist.publish({
    id: 'home',
    title: '首页',
    factsText: buildHomeAssistFacts()
  })
}

onMounted(() => {
  if (!activeProfileId.value && profiles.value.length) {
    profilesStore.setActive(profiles.value[0].id)
  }
  publishHomeAssist()
})

onActivated(() => {
  publishHomeAssist()
})

/** 工作台卡片（含字标印章） */
const cards = [
  {
    to: '/bazi',
    tag: '排盘',
    mark: '八',
    title: 'AI 八字排盘',
    desc: '节气排盘、细盘、神煞与规则总断；排盘后用命师助手追问。'
  },
  {
    to: '/daily',
    tag: '日运',
    mark: '日',
    title: '每日运势',
    desc: '本命喜用叠今日流日与流年，分项看事业、财运、人际与身心。'
  },
  {
    to: '/hehun',
    tag: '合盘',
    mark: '合',
    title: '八字合婚 / 合盘',
    desc: '双人日支、喜用互补、十神互见；合盘后用命师助手追问相处。'
  },
  {
    to: '/trend',
    tag: '走势',
    mark: '势',
    title: '大运流年走势',
    desc: '中长期十年大运与流年柱状评分，先看阶段再定怎么动。'
  },
  {
    to: '/liuyao',
    tag: '占卜',
    mark: '爻',
    title: '六爻起卦',
    desc: '近段事态顺逆，与八字长周期互相参照。'
  },
  {
    to: '/ziwei',
    tag: '紫微',
    mark: '紫',
    title: '紫微斗数',
    desc: '十二宫主星、辅星、生年四化与大限完整排盘；排盘后用命师助手解答。'
  },
  {
    to: '/fengshui',
    tag: '风水',
    mark: '风',
    title: '阳宅风水',
    desc: '定位/手填经纬度与罗盘取坐向，八宅游年叠流年/流月飞星方位卡。'
  },
  {
    to: '/huangli',
    tag: '黄历',
    mark: '历',
    title: '黄历宜忌',
    desc: '宜忌、冲煞、值神、吉神凶煞、彭祖百忌、二十八宿与建除干支。'
  },
  {
    to: '/rules',
    tag: '学堂',
    mark: '学',
    title: '规则与读盘指南',
    desc: '十神口诀、神煞全库、经典书目与六块读盘方法论。'
  }
]

/** 当前活跃命例 */
const activeProfile = computed(() => profilesStore.byId(activeProfileId.value))

/** 今日运势摘要（有命例时） */
const todayFortune = computed(() => {
  const p = activeProfile.value
  if (!p) return null
  try {
    const chart = buildBaZi(p.year, p.month, p.day, p.hourUnknown ? null : p.hour, 0)
    return buildDailyFortune(chart, p.gender, new Date())
  } catch {
    return null
  }
})

const lunarToday = computed(() => lunarLabelOf(new Date()))
</script>

<template>
  <section class="hero rise">
    <img class="hero-logo" :src="appIcon" width="72" height="72" alt="易学桌面" />
    <p class="eyebrow">YI DESKTOP</p>
    <h1>命理工作台</h1>
    <p class="lead">
      规则引擎排盘断语，命师助手追问解读。首页可问用法与命理概念（离线书库）；各功能页问本盘结果。
    </p>

    <article v-if="todayFortune && activeProfile" class="daily-card">
      <div class="daily-head">
        <div>
          <p class="daily-label">
            <span class="ico-dot" aria-hidden="true" />
            今日运势 · {{ lunarToday }}
          </p>
          <h2>{{ activeProfile.label }}</h2>
          <p class="daily-meta">
            流日 {{ todayFortune.dayGz }}（{{ todayFortune.dayShiShen }}）· 流年 {{ todayFortune.yearGz }}
          </p>
        </div>
        <div class="daily-score" :data-band="todayFortune.band">
          {{ todayFortune.score }}
          <span>{{ todayFortune.band }}</span>
        </div>
      </div>
      <p class="daily-summary">{{ todayFortune.summary }}</p>
      <router-link class="daily-link" to="/daily">查看分项与宜忌 →</router-link>
    </article>

    <article v-else class="daily-card empty">
      <p>保存命例后，首页会显示今日运势摘要。</p>
      <router-link class="daily-link" to="/bazi">去排盘并保存命例 →</router-link>
    </article>

    <div class="workspace">
      <router-link v-for="c in cards" :key="c.to" class="card" :to="c.to">
        <div class="card-top">
          <span class="card-seal" aria-hidden="true">{{ c.mark }}</span>
          <span class="card-tag">{{ c.tag }}</span>
        </div>
        <h2>{{ c.title }}</h2>
        <p>{{ c.desc }}</p>
        <span class="enter">进入 →</span>
      </router-link>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  max-width: min(1180px, 100%);
  padding-bottom: 48px;
}

.hero-logo {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  object-fit: cover;
  margin-bottom: 18px;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--gold) 40%, transparent),
    var(--shadow);
}

.eyebrow {
  margin: 0 0 12px;
  font-size: 0.75rem;
  letter-spacing: 0.28em;
  color: var(--teal);
  font-weight: 600;
}

h1 {
  margin: 0;
  font-family: var(--font-brand);
  font-size: clamp(2.4rem, 6vw, 3.6rem);
  font-weight: 400;
  letter-spacing: 0.1em;
  line-height: 1.05;
}

.lead {
  margin: 16px 0 20px;
  font-size: 1.02rem;
  line-height: 1.7;
  color: var(--ink-soft);
  max-width: 36em;
}

.daily-card {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--teal) 8%, transparent), transparent 42%),
    var(--surface-solid);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 20px 22px;
  margin-bottom: 24px;
  box-shadow: var(--shadow);
}

.daily-card.empty {
  color: var(--ink-soft);
}

.daily-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.daily-label {
  margin: 0 0 4px;
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  color: var(--teal);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.ico-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--teal);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--teal) 22%, transparent);
}

.daily-card h2 {
  margin: 0;
  font-size: 1.25rem;
  font-family: var(--font-display);
}

.daily-meta {
  margin: 6px 0 0;
  font-size: 0.85rem;
  color: var(--ink-soft);
}

.daily-score {
  font-family: var(--font-brand);
  font-size: 2.8rem;
  line-height: 1;
  text-align: right;
  color: var(--band-mid);
  min-width: 4rem;
}

.daily-score span {
  display: block;
  font-size: 0.9rem;
  font-family: var(--font-ui);
  margin-top: 4px;
  letter-spacing: 0.12em;
}

.daily-score[data-band='高'] {
  color: var(--band-high);
}
.daily-score[data-band='中'] {
  color: var(--band-mid);
}
.daily-score[data-band='低'] {
  color: var(--band-low);
}

.daily-summary {
  margin: 14px 0 10px;
  line-height: 1.65;
}

.daily-link {
  color: var(--seal);
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
}

.workspace {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

@media (max-width: 560px) {
  .hero {
    padding-bottom: 24px;
  }
  .hero-logo {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    margin-bottom: 12px;
  }
  h1 {
    font-size: clamp(1.85rem, 8vw, 2.4rem);
    letter-spacing: 0.08em;
  }
  .lead {
    font-size: 0.92rem;
    margin: 12px 0 16px;
  }
  .daily-card {
    padding: 16px;
    border-radius: 14px;
  }
  .workspace {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .card {
    padding: 14px 16px;
    border-radius: 14px;
  }
}

.card {
  display: flex;
  flex-direction: column;
  padding: 18px 20px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--surface-solid);
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow);
  border-color: color-mix(in srgb, var(--teal) 40%, var(--line));
}

.card-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-seal {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: color-mix(in srgb, var(--teal) 16%, var(--surface-strong));
  color: var(--teal);
  font-family: var(--font-display);
  font-size: 0.92rem;
  border: 1px solid color-mix(in srgb, var(--teal) 28%, transparent);
}

.card:hover .card-seal {
  background: var(--teal);
  color: var(--on-accent);
  border-color: transparent;
}

.card-tag {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  color: var(--teal);
  font-weight: 600;
}

.card h2 {
  margin: 10px 0 6px;
  font-size: 1.12rem;
  font-family: var(--font-display);
}

.card p {
  margin: 0;
  flex: 1;
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--ink-soft);
}

.enter {
  margin-top: 12px;
  font-size: 0.85rem;
  color: var(--seal);
  font-weight: 600;
}
</style>
