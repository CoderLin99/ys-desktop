<script setup lang="ts">
/**
 * 命理电子罗盘：参考经典罗盘盘面结构（度盘 / 二十四山 / 八卦 / 天池十字丝），
 * 视觉走墨金 + 科幻 HUD，PC / 移动端自适应尺寸。
 * 指针固定向上表示「向」；盘面随朝向角反向旋转。
 */
import { computed } from 'vue'
import {
  ERSHISI_SHAN,
  headingToShanIndex,
  resolveSittingFacing
} from '@rules/fengshui/compass'

const props = withDefaults(
  defineProps<{
    /** 朝向角 0–360，正北为 0（顺时针） */
    headingDeg: number
    /** 是否正在监听设备传感器 */
    active?: boolean
    /** 盘面基准边长 px；≤0 时走 CSS 自适应 */
    size?: number
    /** 横倾角（beta），可选 */
    tiltX?: number | null
    /** 竖倾角（gamma），可选 */
    tiltY?: number | null
  }>(),
  { active: false, size: 0, tiltX: null, tiltY: null }
)

/** 后天八卦：宫名、中心角、卦符 */
const BAGUA = [
  { name: '坎', symbol: '☵', deg: 0 },
  { name: '艮', symbol: '☶', deg: 45 },
  { name: '震', symbol: '☳', deg: 90 },
  { name: '巽', symbol: '☴', deg: 135 },
  { name: '离', symbol: '☲', deg: 180 },
  { name: '坤', symbol: '☷', deg: 225 },
  { name: '兑', symbol: '☱', deg: 270 },
  { name: '乾', symbol: '☰', deg: 315 }
] as const

/** 天池八方标签（固定不随盘转） */
const CARDINALS = [
  { label: '北', short: 'N', deg: 0 },
  { label: '东北', short: 'NE', deg: 45 },
  { label: '东', short: 'E', deg: 90 },
  { label: '东南', short: 'SE', deg: 135 },
  { label: '南', short: 'S', deg: 180 },
  { label: '西南', short: 'SW', deg: 225 },
  { label: '西', short: 'W', deg: 270 },
  { label: '西北', short: 'NW', deg: 315 }
] as const

/** 二十四山标签（含主山 / 卦山标记） */
const shanLabels = ERSHISI_SHAN.map((name, i) => ({
  name,
  deg: i * 15,
  major: '子午卯酉'.includes(name),
  trigram: '乾坤艮巽'.includes(name),
  /** 奇偶交替底色，贴近参考图黑金分段 */
  band: i % 2 === 0 ? 'dark' : 'light'
}))

/** 外圈度盘刻度：每 10° 一个大刻 + 数字，其余每 2° 小刻 */
const degreeMarks = Array.from({ length: 180 }, (_, i) => {
  const deg = i * 2
  return {
    deg,
    major: deg % 10 === 0,
    label: deg % 30 === 0 ? String(deg) : null
  }
})

/** 坐向文案 */
const sittingFacing = computed(() => resolveSittingFacing(props.headingDeg))

/** 当前向山 */
const facingShan = computed(() => ERSHISI_SHAN[headingToShanIndex(props.headingDeg)])

/** 精细度数展示（一位小数） */
const degText = computed(() => {
  const d = ((props.headingDeg % 360) + 360) % 360
  return d.toFixed(1)
})

/** 横/竖倾角展示 */
const tiltH = computed(() =>
  props.tiltX == null || Number.isNaN(props.tiltX) ? '—' : `${Math.round(props.tiltX)}°`
)
const tiltV = computed(() =>
  props.tiltY == null || Number.isNaN(props.tiltY) ? '—' : `${Math.round(props.tiltY)}°`
)

/**
 * 盘面尺寸：显式 size 优先，否则交给 CSS clamp。
 */
const plateStyle = computed(() => {
  if (props.size && props.size > 0) {
    return { '--compass-size': `${props.size}px` } as Record<string, string>
  }
  return {}
})

/** 盘面旋转（反转朝向角，使「向」对准上方准星） */
const dialStyle = computed(() => ({
  transform: `rotate(${-props.headingDeg}deg)`
}))
</script>

<template>
  <div
    class="e-compass"
    :class="{ on: active }"
    :style="plateStyle"
    :aria-label="`朝向 ${degText} 度，坐${sittingFacing.sitting}向${facingShan}`"
  >
    <!-- 顶部 HUD：坐向 / 度数胶囊 / 倾角 -->
    <div class="hud" aria-hidden="false">
      <div class="hud-side left">
        <span class="hud-row"
          ><em>坐</em> {{ sittingFacing.sitting }}·{{ sittingFacing.sittingGua }}</span
        >
        <span class="hud-row"
          ><em>向</em> {{ facingShan }}·{{ sittingFacing.facingGua }}</span
        >
      </div>
      <div class="hud-pill" title="当前朝向角">
        <strong>{{ degText }}°</strong>
      </div>
      <div class="hud-side right">
        <span class="hud-row"><em>横</em> {{ tiltH }}</span>
        <span class="hud-row"><em>竖</em> {{ tiltV }}</span>
      </div>
    </div>

    <div class="stage">
      <div class="halo" aria-hidden="true" />
      <div class="scan" aria-hidden="true" />

      <div class="plate">
        <!-- 随朝向旋转的盘面 -->
        <div class="dial" :style="dialStyle">
          <!-- 度盘刻度 -->
          <div class="deg-ring" aria-hidden="true">
            <i
              v-for="m in degreeMarks"
              :key="'t' + m.deg"
              class="deg-tick"
              :class="{ major: m.major }"
              :style="{ transform: `rotate(${m.deg}deg)` }"
            />
            <span
              v-for="m in degreeMarks.filter((x) => x.label)"
              :key="'l' + m.deg"
              class="deg-num"
              :style="{ transform: `rotate(${m.deg}deg) translateY(-46.5%)` }"
            >
              <b :style="{ transform: `rotate(${-m.deg}deg)` }">{{ m.label }}</b>
            </span>
          </div>

          <!-- 二十四山环（黑金交替扇区） -->
          <div class="shan-ring" aria-hidden="true">
            <span
              v-for="lab in shanLabels"
              :key="'band-' + lab.name"
              class="shan-band"
              :class="lab.band"
              :style="{ transform: `rotate(${lab.deg - 7.5}deg)` }"
            />
          </div>
          <span
            v-for="lab in shanLabels"
            :key="lab.name"
            class="shan"
            :class="{ major: lab.major, trigram: lab.trigram }"
            :style="{ transform: `rotate(${lab.deg}deg) translateY(-38%)` }"
          >
            <i :style="{ transform: `rotate(${-lab.deg}deg)` }">{{ lab.name }}</i>
          </span>

          <!-- 八卦环 -->
          <span
            v-for="b in BAGUA"
            :key="b.name"
            class="gua"
            :style="{ transform: `rotate(${b.deg}deg) translateY(-27%)` }"
          >
            <em :style="{ transform: `rotate(${-b.deg}deg)` }">
              <span class="gua-sym">{{ b.symbol }}</span>
              <span class="gua-name">{{ b.name }}</span>
            </em>
          </span>

          <div class="ring r-outer" />
          <div class="ring r-shan" />
          <div class="ring r-gua" />
          <div class="ring r-core" />

          <span class="n-mark">北</span>
        </div>

        <!-- 固定层：十字丝 + 天池 + 指针 -->
        <div class="crosshair" aria-hidden="true">
          <span class="ch-h" />
          <span class="ch-v" />
        </div>

        <div class="tianchi" aria-hidden="true">
          <span
            v-for="c in CARDINALS"
            :key="c.short"
            class="cardinal"
            :class="{ primary: c.deg % 90 === 0 }"
            :style="{ transform: `rotate(${c.deg}deg) translateY(-42%)` }"
          >
            <i :style="{ transform: `rotate(${-c.deg}deg)` }">{{
              c.deg % 90 === 0 ? c.short : c.label
            }}</i>
          </span>
          <div class="needle">
            <span class="blade north" />
            <span class="blade south" />
            <span class="hub" />
          </div>
        </div>
      </div>
    </div>

    <div class="readout">
      <small>{{ active ? '感应天机 · 实时罗盘' : '手调方位 · 或开启感应' }}</small>
    </div>
  </div>
</template>

<style scoped>
.e-compass {
  /* 自适应：移动端近满宽，PC 上限约 440 */
  --compass-size: clamp(260px, min(88vw, 72vmin), 440px);
  --hud-glow: color-mix(in srgb, var(--teal) 55%, var(--gold));
  position: relative;
  display: grid;
  justify-items: center;
  gap: 12px;
  margin: 8px 0 12px;
  width: 100%;
  font-family: var(--font-display);
}

/* —— 顶部 HUD —— */
.hud {
  width: min(100%, calc(var(--compass-size) + 48px));
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px 10px;
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--gold) 35%, var(--line));
  background:
    linear-gradient(
      120deg,
      color-mix(in srgb, var(--teal) 12%, transparent),
      color-mix(in srgb, var(--surface-solid) 88%, transparent) 40%,
      color-mix(in srgb, var(--gold) 10%, transparent)
    ),
    var(--surface-solid);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--teal) 12%, transparent),
    0 10px 28px color-mix(in srgb, var(--ink) 10%, transparent),
    inset 0 1px 0 color-mix(in srgb, #fff 12%, transparent);
  backdrop-filter: blur(10px);
}
.hud-side {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  font-family: var(--font-ui);
  font-size: 0.78rem;
  color: var(--ink);
  letter-spacing: 0.04em;
}
.hud-side.left {
  text-align: left;
  padding-left: 4px;
}
.hud-side.right {
  text-align: right;
  padding-right: 4px;
}
.hud-row em {
  font-style: normal;
  color: var(--muted);
  margin-right: 4px;
  font-size: 0.72rem;
}
.hud-pill {
  display: grid;
  place-items: center;
  min-width: 5.6rem;
  padding: 8px 16px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 88%, var(--teal));
  color: var(--on-deep);
  box-shadow:
    0 0 18px color-mix(in srgb, var(--teal) 35%, transparent),
    inset 0 0 0 1px color-mix(in srgb, var(--gold) 45%, transparent);
}
.hud-pill strong {
  font-family: var(--font-ui);
  font-variant-numeric: tabular-nums;
  font-size: 1.15rem;
  letter-spacing: 0.04em;
  font-weight: 700;
}
.e-compass.on .hud-pill {
  box-shadow:
    0 0 22px color-mix(in srgb, var(--teal) 55%, transparent),
    0 0 4px color-mix(in srgb, var(--gold) 40%, transparent),
    inset 0 0 0 1px var(--gold);
}

/* —— 舞台 —— */
.stage {
  position: relative;
  width: var(--compass-size);
  height: var(--compass-size);
  display: grid;
  place-items: center;
}
.halo {
  position: absolute;
  inset: -8%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--gold) 28%, transparent) 0%,
    color-mix(in srgb, var(--teal) 12%, transparent) 42%,
    transparent 70%
  );
  pointer-events: none;
  animation: halo-breathe 4.8s ease-in-out infinite;
}
.e-compass.on .halo {
  animation-duration: 2.6s;
}
@keyframes halo-breathe {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.95;
    transform: scale(1.04);
  }
}
.scan {
  position: absolute;
  inset: 2%;
  border-radius: 50%;
  pointer-events: none;
  background: conic-gradient(
    from 210deg,
    transparent 0deg,
    color-mix(in srgb, var(--teal) 18%, transparent) 28deg,
    transparent 56deg
  );
  mask: radial-gradient(circle, transparent 58%, #000 60%, #000 98%, transparent 100%);
  opacity: 0.35;
  animation: scan-spin 12s linear infinite;
}
.e-compass.on .scan {
  opacity: 0.55;
  animation-duration: 7s;
}
@keyframes scan-spin {
  to {
    transform: rotate(360deg);
  }
}

.plate {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.dial {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(
      circle at 50% 40%,
      color-mix(in srgb, var(--gold) 14%, transparent),
      transparent 46%
    ),
    radial-gradient(
      circle at 50% 50%,
      color-mix(in srgb, var(--ink) 82%, #0a1210) 0%,
      color-mix(in srgb, var(--ink) 92%, #000) 100%
    );
  border: 2px solid color-mix(in srgb, var(--gold) 70%, var(--line));
  box-shadow:
    inset 0 0 0 2px color-mix(in srgb, var(--teal) 28%, transparent),
    inset 0 0 36px color-mix(in srgb, #000 55%, transparent),
    0 0 0 1px color-mix(in srgb, var(--gold) 25%, transparent),
    0 16px 40px color-mix(in srgb, var(--ink) 28%, transparent),
    0 0 32px color-mix(in srgb, var(--teal) 18%, transparent);
  transition: transform 0.1s linear;
  overflow: hidden;
}
.e-compass.on .dial {
  border-color: var(--gold);
  box-shadow:
    inset 0 0 0 2px color-mix(in srgb, var(--teal) 40%, transparent),
    inset 0 0 36px color-mix(in srgb, #000 55%, transparent),
    0 0 0 1px var(--gold),
    0 16px 40px color-mix(in srgb, var(--ink) 28%, transparent),
    0 0 40px color-mix(in srgb, var(--teal) 28%, transparent);
}

.ring {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  border: 1px solid color-mix(in srgb, var(--gold) 32%, transparent);
}
.r-outer {
  inset: 5.5%;
}
.r-shan {
  inset: 18%;
  border-color: color-mix(in srgb, var(--gold) 55%, transparent);
}
.r-gua {
  inset: 32%;
  border-style: dashed;
  border-color: color-mix(in srgb, var(--teal) 40%, var(--gold));
  opacity: 0.85;
}
.r-core {
  inset: 42%;
  border-color: color-mix(in srgb, var(--gold) 40%, transparent);
}

/* 度盘 */
.deg-ring {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.deg-tick {
  position: absolute;
  left: 50%;
  top: 1.8%;
  width: 1px;
  height: 5px;
  margin-left: -0.5px;
  background: color-mix(in srgb, var(--gold) 55%, #fff);
  transform-origin: 50% calc(var(--compass-size) * 0.482);
  opacity: 0.55;
}
.deg-tick.major {
  height: 9px;
  width: 1.5px;
  margin-left: -0.75px;
  opacity: 0.95;
  background: var(--gold);
}
.deg-num {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1.6em;
  margin-left: -0.8em;
  margin-top: -0.55em;
  pointer-events: none;
}
.deg-num b {
  display: inline-block;
  font-family: var(--font-ui);
  font-size: clamp(0.48rem, 1.6vw, 0.62rem);
  font-weight: 600;
  color: color-mix(in srgb, var(--gold) 85%, #fff);
  letter-spacing: 0;
  opacity: 0.9;
}

/* 二十四山扇区 */
.shan-ring {
  position: absolute;
  inset: 18%;
  border-radius: 50%;
  overflow: hidden;
  pointer-events: none;
  mask: radial-gradient(circle, transparent 58%, #000 59%);
}
.shan-band {
  position: absolute;
  left: 50%;
  top: 0;
  width: 15.2%;
  height: 50%;
  margin-left: -7.6%;
  transform-origin: 50% 100%;
  opacity: 0.55;
}
.shan-band.dark {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--gold) 55%, #1a1408) 0%,
    color-mix(in srgb, var(--gold) 18%, transparent) 100%
  );
}
.shan-band.light {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, #0a0e0c 90%, var(--teal)) 0%,
    color-mix(in srgb, #000 40%, transparent) 100%
  );
}

.shan {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1.2em;
  margin-left: -0.6em;
  margin-top: -0.6em;
  font-size: clamp(0.62rem, 2.1vw, 0.78rem);
  color: color-mix(in srgb, #f5f0e0 88%, var(--gold));
  pointer-events: none;
  z-index: 2;
}
.shan.major {
  color: #ffd98a;
  font-weight: 800;
  font-size: clamp(0.72rem, 2.4vw, 0.92rem);
  text-shadow: 0 0 8px color-mix(in srgb, var(--gold) 55%, transparent);
}
.shan.trigram {
  color: color-mix(in srgb, var(--teal) 70%, #fff);
  font-weight: 700;
}
.shan i {
  display: inline-block;
  font-style: normal;
}

.gua {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 2.2em;
  margin-left: -1.1em;
  margin-top: -1.1em;
  pointer-events: none;
  z-index: 2;
}
.gua em {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  font-style: normal;
  line-height: 1.05;
}
.gua-sym {
  font-size: clamp(0.72rem, 2.2vw, 0.95rem);
  color: var(--gold);
  text-shadow: 0 0 6px color-mix(in srgb, var(--gold) 40%, transparent);
}
.gua-name {
  font-size: clamp(0.55rem, 1.7vw, 0.68rem);
  font-weight: 700;
  color: color-mix(in srgb, #fff 75%, var(--teal));
  letter-spacing: 0.08em;
}

.n-mark {
  position: absolute;
  left: 50%;
  top: 7.5%;
  transform: translateX(-50%);
  font-size: clamp(0.62rem, 1.8vw, 0.75rem);
  font-weight: 800;
  color: var(--gold);
  letter-spacing: 0.28em;
  text-indent: 0.28em;
  text-shadow: 0 0 10px color-mix(in srgb, var(--gold) 50%, transparent);
  z-index: 3;
}

/* 十字丝（固定） */
.crosshair {
  position: absolute;
  inset: 4%;
  pointer-events: none;
  z-index: 4;
}
.ch-h,
.ch-v {
  position: absolute;
  background: color-mix(in srgb, var(--seal) 88%, #ff3a2a);
  box-shadow: 0 0 6px color-mix(in srgb, var(--seal) 55%, transparent);
  opacity: 0.92;
}
.ch-h {
  left: 0;
  right: 0;
  top: 50%;
  height: 1.5px;
  margin-top: -0.75px;
}
.ch-v {
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1.5px;
  margin-left: -0.75px;
}

/* 天池 */
.tianchi {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 34%;
  height: 34%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  z-index: 5;
  background:
    radial-gradient(circle at 42% 38%, #fff 0%, #f3f6f4 42%, #d8e2dc 100%);
  border: 2px solid color-mix(in srgb, var(--gold) 55%, #fff);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--ink) 55%, transparent),
    inset 0 0 12px color-mix(in srgb, var(--ink) 12%, transparent),
    0 0 18px color-mix(in srgb, var(--teal) 25%, transparent);
}
.cardinal {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 2em;
  margin-left: -1em;
  margin-top: -0.55em;
  font-family: var(--font-ui);
  font-size: clamp(0.42rem, 1.4vw, 0.55rem);
  color: #4a5a52;
  pointer-events: none;
}
.cardinal.primary {
  font-weight: 800;
  color: #1a2a22;
  font-size: clamp(0.55rem, 1.8vw, 0.7rem);
}
.cardinal i {
  display: inline-block;
  font-style: normal;
}

.needle {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}
.blade {
  position: absolute;
  left: 50%;
  width: 12%;
  margin-left: -6%;
}
.blade.north {
  top: 10%;
  height: 40%;
  background: linear-gradient(180deg, #e84838 0%, #b5402a 70%, #7a2018 100%);
  clip-path: polygon(50% 0, 100% 100%, 50% 86%, 0 100%);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35));
}
.blade.south {
  bottom: 10%;
  height: 38%;
  background: linear-gradient(0deg, #e8ecea 0%, #9aa8a0 100%);
  clip-path: polygon(50% 100%, 100% 0, 50% 14%, 0 0);
  opacity: 0.92;
}
.hub {
  width: 16%;
  height: 16%;
  min-width: 10px;
  min-height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff, var(--gold) 45%, var(--seal));
  box-shadow:
    0 0 0 2px #fff,
    0 0 8px color-mix(in srgb, var(--gold) 50%, transparent);
  z-index: 2;
}

.readout {
  text-align: center;
}
.readout small {
  display: block;
  color: var(--ink-soft);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  font-family: var(--font-ui);
}

@media (max-width: 520px) {
  .hud {
    border-radius: 18px;
    grid-template-columns: 1fr auto 1fr;
    padding: 8px;
  }
  .hud-side {
    font-size: 0.7rem;
  }
  .hud-pill {
    min-width: 4.8rem;
    padding: 7px 12px;
  }
  .hud-pill strong {
    font-size: 1rem;
  }
}

@media (min-width: 900px) {
  .e-compass {
    --compass-size: clamp(320px, 38vw, 460px);
  }
}
</style>
