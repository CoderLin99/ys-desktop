<script setup lang="ts">
/**
 * 命师桌宠：小鲸娘整身立绘 + 独立耳/尾图层摆动。
 * 不引入 oh-my-live2d（会拖垮八字页）；不 clip-path 切全身图（会割头、双尾巴）。
 * 忙碌切思考整帧并关掉耳尾叠加，避免错位。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import idleBodySrc from '../assets/jingniang-idle-body.png'
import thinkSrc from '../assets/jingniang-think.png'
import blinkBodySrc from '../assets/jingniang-blink-body.png'
import earLayerSrc from '../assets/jingniang-ear-layer.png'
import tailLayerSrc from '../assets/jingniang-tail-layer.png'
import { nextPetDelay, PET_BUSY_TIPS, PET_IDLE_TIPS, pickPetTip } from './petTips'

const props = defineProps<{
  /** 助手是否打开 */
  open?: boolean
  /** 正在润色或追问：切思考整帧 */
  busy?: boolean
  /** 尚未排盘时禁用 */
  disabled?: boolean
  /** 按钮说明 */
  label?: string
}>()

/** 当前是否处于闭眼整帧 */
const blinking = ref(false)
/** 气泡台词，空字符串表示不显示 */
const tip = ref('')

let blinkTimer: ReturnType<typeof setTimeout> | null = null
let blinkCloseTimer: ReturnType<typeof setTimeout> | null = null
let talkTimer: ReturnType<typeof setTimeout> | null = null
let talkHideTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 清掉尚未触发的定时器，避免切页后还在眨眼。
 */
function clearPetTimers(): void {
  if (blinkTimer) clearTimeout(blinkTimer)
  if (blinkCloseTimer) clearTimeout(blinkCloseTimer)
  if (talkTimer) clearTimeout(talkTimer)
  if (talkHideTimer) clearTimeout(talkHideTimer)
  blinkTimer = blinkCloseTimer = talkTimer = talkHideTimer = null
}

/**
 * 安排下一次眨眼：整身切到闭眼帧再切回，不裁图层。
 */
function scheduleBlink(): void {
  const wait = props.busy ? nextPetDelay(1600, 3000) : nextPetDelay(2600, 5400)
  blinkTimer = setTimeout(() => {
    blinking.value = true
    blinkCloseTimer = setTimeout(() => {
      blinking.value = false
      scheduleBlink()
    }, 160)
  }, wait)
}

/**
 * 安排下一次自言自语气泡。
 */
function scheduleTalk(): void {
  const wait = props.busy ? nextPetDelay(2600, 5200) : nextPetDelay(9000, 18000)
  talkTimer = setTimeout(() => {
    const pool = props.busy ? PET_BUSY_TIPS : PET_IDLE_TIPS
    tip.value = pickPetTip(pool, tip.value)
    talkHideTimer = setTimeout(() => {
      tip.value = ''
      scheduleTalk()
    }, props.busy ? 2600 : 3400)
  }, wait)
}

/** 忙碌用思考整帧；待机/眨眼用已抠掉耳尾的身体帧，再叠独立图层 */
const frameSrc = computed(() => {
  if (props.busy) return thinkSrc
  if (blinking.value) return blinkBodySrc
  return idleBodySrc
})

/** 思考姿势不同，耳尾叠加只在待机/眨眼时打开 */
const showWagParts = computed(() => !props.busy)

onMounted(() => {
  scheduleBlink()
  scheduleTalk()
})

onUnmounted(() => {
  clearPetTimers()
})

watch(
  () => props.busy,
  () => {
    if (talkTimer) clearTimeout(talkTimer)
    if (talkHideTimer) clearTimeout(talkHideTimer)
    tip.value = pickPetTip(props.busy ? PET_BUSY_TIPS : PET_IDLE_TIPS, tip.value)
    talkHideTimer = setTimeout(() => {
      tip.value = ''
      scheduleTalk()
    }, 2800)
  }
)
</script>

<template>
  <span class="pet" :class="{ open, busy, disabled }" aria-hidden="true">
    <span v-if="tip" class="bubble">{{ tip }}</span>
    <span class="stage">
      <img v-if="showWagParts" class="part tail" :src="tailLayerSrc" alt="" draggable="false" />
      <img class="sprite" :src="frameSrc" alt="" draggable="false" />
      <img v-if="showWagParts" class="part ear left" :src="earLayerSrc" alt="" draggable="false" />
      <img v-if="showWagParts" class="part ear right" :src="earLayerSrc" alt="" draggable="false" />
    </span>
    <span v-if="label" class="pet-label">{{ label }}</span>
  </span>
</template>

<style scoped>
.pet {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  width: 148px;
  pointer-events: none;
}
.stage {
  position: relative;
  width: 140px;
  height: 168px;
  animation: pet-bob 3.2s ease-in-out infinite;
}
.pet.busy .stage {
  animation-duration: 1.4s;
}
.sprite,
.part {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center bottom;
  user-select: none;
  -webkit-user-drag: none;
}
.sprite {
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 8px 10px rgba(18, 40, 72, 0.22));
}
.part {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
/* 尾巴在身后再摆，转轴在接身体处 */
.tail {
  z-index: 0;
  transform-origin: 72% 64%;
  animation: tail-wag 1.85s ease-in-out infinite;
}
/* 只裁耳图层左右半幅，不裁全身图；左右耳根分别摆 */
.ear {
  z-index: 2;
}
.ear.left {
  clip-path: inset(6% 48% 48% 8%);
  transform-origin: 36% 40%;
  animation: ear-wag-l 2.15s ease-in-out infinite;
}
.ear.right {
  clip-path: inset(6% 8% 48% 48%);
  transform-origin: 64% 38%;
  animation: ear-wag-r 2.45s ease-in-out infinite 0.12s;
}
.bubble {
  position: absolute;
  right: 8px;
  bottom: 168px;
  z-index: 3;
  max-width: 148px;
  padding: 6px 10px;
  border-radius: 10px 10px 4px 10px;
  background: var(--surface-solid);
  color: var(--ink);
  font-size: 0.68rem;
  line-height: 1.35;
  letter-spacing: 0.04em;
  box-shadow: 0 6px 16px rgba(20, 40, 60, 0.16);
  text-align: left;
}
.bubble::after {
  content: '';
  position: absolute;
  right: 22px;
  bottom: -6px;
  border: 6px solid transparent;
  border-top-color: var(--surface-solid);
  border-bottom: 0;
}
html[data-theme='dark'] .bubble {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
}
.pet-label {
  margin-top: -2px;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  color: var(--ink);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
}
html[data-theme='dark'] .pet-label {
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.45);
}
.pet.disabled .sprite {
  filter: grayscale(0.4) drop-shadow(0 8px 10px rgba(18, 40, 72, 0.16));
}
@keyframes pet-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}
@keyframes ear-wag-l {
  0%,
  100% {
    transform: rotate(-4deg);
  }
  50% {
    transform: rotate(10deg);
  }
}
@keyframes ear-wag-r {
  0%,
  100% {
    transform: rotate(5deg);
  }
  50% {
    transform: rotate(-9deg);
  }
}
@keyframes tail-wag {
  0%,
  100% {
    transform: rotate(-7deg);
  }
  50% {
    transform: rotate(11deg);
  }
}
</style>
