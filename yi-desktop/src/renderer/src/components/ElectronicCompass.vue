<script setup lang="ts">
/**
 * 命理电子罗盘：二十四山 + 后天八卦方位，墨金盘面。
 * 指针固定向上表示「向」；盘面随设备朝向反转。
 */
import { computed } from 'vue'
import { ERSHISI_SHAN, headingToShanIndex } from '@rules/fengshui/compass'

const props = withDefaults(
  defineProps<{
    /** 朝向角 0–360，正北为 0 */
    headingDeg: number
    /** 是否正在监听设备 */
    active?: boolean
    /** 尺寸 px */
    size?: number
  }>(),
  { active: false, size: 260 }
)

/** 后天八卦：方位名与角度（中心） */
const BAGUA = [
  { name: '坎', deg: 0 },
  { name: '艮', deg: 45 },
  { name: '震', deg: 90 },
  { name: '巽', deg: 135 },
  { name: '离', deg: 180 },
  { name: '坤', deg: 225 },
  { name: '兑', deg: 270 },
  { name: '乾', deg: 315 }
] as const

/** 二十四山标签 */
const labels = ERSHISI_SHAN.map((name, i) => ({
  name,
  deg: i * 15,
  major: '子午卯酉'.includes(name),
  trigram: '乾坤艮巽'.includes(name)
}))

/** 当前向山 */
const shan = computed(() => ERSHISI_SHAN[headingToShanIndex(props.headingDeg)])

/** 盘面旋转 */
const dialStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  transform: `rotate(${-props.headingDeg}deg)`
}))
</script>

<template>
  <div
    class="e-compass"
    :class="{ on: active }"
    :aria-label="`朝向 ${Math.round(headingDeg)} 度，向${shan}`"
  >
    <div class="plate">
      <div class="halo" aria-hidden="true" />
      <div class="dial" :style="dialStyle">
        <!-- 外环刻度 -->
        <div class="ticks" aria-hidden="true">
          <i v-for="n in 72" :key="n" :style="{ transform: `rotate(${(n - 1) * 5}deg)` }" />
        </div>
        <div class="ring outer" />
        <div class="ring mid" />
        <div class="ring inner" />
        <!-- 八卦方位 -->
        <span
          v-for="b in BAGUA"
          :key="b.name"
          class="gua"
          :style="{ transform: `rotate(${b.deg}deg) translateY(-34%)` }"
        >
          <em :style="{ transform: `rotate(${-b.deg}deg)` }">{{ b.name }}</em>
        </span>
        <!-- 二十四山 -->
        <span
          v-for="lab in labels"
          :key="lab.name"
          class="shan"
          :class="{ major: lab.major, trigram: lab.trigram }"
          :style="{ transform: `rotate(${lab.deg}deg) translateY(-44%)` }"
        >
          <i :style="{ transform: `rotate(${-lab.deg}deg)` }">{{ lab.name }}</i>
        </span>
        <span class="n-mark">北</span>
        <span class="center-seal" aria-hidden="true">罗经</span>
      </div>
      <div class="needle" aria-hidden="true">
        <span class="needle-blade" />
        <span class="needle-hub" />
      </div>
    </div>
    <div class="readout">
      <div class="read-main">
        <strong>向{{ shan }}</strong>
        <span class="deg">{{ Math.round(headingDeg) }}°</span>
      </div>
      <small>{{ active ? '感应天机 · 实时罗盘' : '手调方位 · 或开启感应' }}</small>
    </div>
  </div>
</template>

<style scoped>
.e-compass {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 14px;
  margin: 10px 0 14px;
  font-family: var(--font-display);
}
.plate {
  position: relative;
  display: grid;
  place-items: center;
}
.halo {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--gold) 22%, transparent) 0%,
    transparent 68%
  );
  pointer-events: none;
  animation: halo-breathe 4.8s ease-in-out infinite;
}
.e-compass.on .halo {
  animation-duration: 2.8s;
}
@keyframes halo-breathe {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(1);
  }
  50% {
    opacity: 0.95;
    transform: scale(1.03);
  }
}
.dial {
  position: relative;
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--gold) 16%, var(--surface-solid)), transparent 42%),
    radial-gradient(circle at 50% 50%, var(--surface-solid) 0%, color-mix(in srgb, var(--ink) 8%, var(--paper-deep)) 100%);
  border: 2px solid color-mix(in srgb, var(--gold) 55%, var(--line));
  box-shadow:
    inset 0 0 0 3px color-mix(in srgb, var(--teal) 18%, transparent),
    inset 0 0 28px color-mix(in srgb, var(--ink) 12%, transparent),
    0 14px 36px color-mix(in srgb, var(--ink) 16%, transparent);
  transition: transform 0.12s linear;
}
.e-compass.on .dial {
  border-color: var(--gold);
}
.ticks {
  position: absolute;
  inset: 4%;
  pointer-events: none;
}
.ticks i {
  position: absolute;
  left: 50%;
  top: 0;
  width: 1px;
  height: 7px;
  margin-left: -0.5px;
  background: color-mix(in srgb, var(--gold) 45%, transparent);
  transform-origin: 50% 625%;
}
.ring {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  border: 1px solid color-mix(in srgb, var(--gold) 28%, transparent);
}
.ring.outer {
  inset: 8%;
  border-style: solid;
  border-width: 1px;
}
.ring.mid {
  inset: 18%;
  border-style: dashed;
  opacity: 0.85;
}
.ring.inner {
  inset: 28%;
  border-color: color-mix(in srgb, var(--teal) 35%, transparent);
}
.gua {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1.4em;
  margin-left: -0.7em;
  margin-top: -0.7em;
  pointer-events: none;
}
.gua em {
  display: inline-block;
  font-style: normal;
  font-size: 0.78rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--gold) 80%, var(--ink));
  letter-spacing: 0.06em;
  text-shadow: 0 1px 0 color-mix(in srgb, var(--surface-solid) 80%, transparent);
}
.shan {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1.15em;
  margin-left: -0.575em;
  margin-top: -0.575em;
  font-size: 0.68rem;
  color: var(--ink-soft);
  pointer-events: none;
}
.shan.major {
  color: var(--seal);
  font-weight: 800;
  font-size: 0.8rem;
}
.shan.trigram {
  color: var(--teal);
  font-weight: 700;
}
.shan i {
  display: inline-block;
  font-style: normal;
}
.n-mark {
  position: absolute;
  left: 50%;
  top: 3.5%;
  transform: translateX(-50%);
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--gold);
  letter-spacing: 0.2em;
}
.center-seal {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 3.2em;
  height: 3.2em;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--seal) 18%, var(--surface-solid)),
    var(--surface-solid)
  );
  color: var(--seal);
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  font-weight: 700;
  box-shadow: inset 0 0 10px color-mix(in srgb, var(--gold) 15%, transparent);
}
.needle {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
}
.needle-blade {
  position: absolute;
  top: 18%;
  left: 50%;
  width: 10px;
  height: 34%;
  margin-left: -5px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--seal) 92%, #fff) 0%,
    color-mix(in srgb, var(--gold) 70%, var(--seal)) 55%,
    transparent 100%
  );
  clip-path: polygon(50% 0, 100% 100%, 50% 88%, 0 100%);
  filter: drop-shadow(0 3px 6px color-mix(in srgb, var(--ink) 28%, transparent));
}
.needle-hub {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff6, var(--gold) 45%, var(--seal));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--surface-solid) 80%, transparent);
  z-index: 2;
}
.readout {
  text-align: center;
}
.read-main {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 10px;
}
.readout strong {
  color: var(--seal);
  font-size: 1.25rem;
  letter-spacing: 0.12em;
}
.readout .deg {
  font-family: var(--font-ui);
  color: var(--teal);
  font-weight: 700;
  font-size: 1.05rem;
}
.readout small {
  display: block;
  margin-top: 4px;
  color: var(--ink-soft);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  font-family: var(--font-ui);
}
</style>
