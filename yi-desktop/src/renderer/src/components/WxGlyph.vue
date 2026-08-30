<script setup lang="ts">
/**
 * 五行矢量小图标：木芽 / 火焰 / 土台 / 金锭 / 水波，颜色跟主题 --wx-*。
 */
import type { WuXing } from '@rules/constants'

const props = withDefaults(
  defineProps<{
    /** 五行 */
    wx: WuXing
    /** 边长 px */
    size?: number
  }>(),
  { size: 14 }
)
</script>

<template>
  <span class="wx-glyph" :data-wx="props.wx" :style="{ width: size + 'px', height: size + 'px' }" :title="props.wx">
    <!-- 木：新芽 -->
    <svg v-if="props.wx === '木'" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 14V7.5M5.2 9.2c0-2.4 1.4-4.2 2.8-5.7C9.4 5 10.8 6.8 10.8 9.2c0 1.1-.5 2-1.3 2.5.7-.1 1.5-.7 1.9-1.7C12 7.5 10.4 5.2 8 3.2 5.6 5.2 4 7.5 4.6 10c.4 1 .2 1.6 1.9 1.7-.8-.5-1.3-1.4-1.3-2.5Z"
      />
    </svg>
    <!-- 火：焰心 -->
    <svg v-else-if="props.wx === '火'" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1.5c1.2 2.2.4 3.6-.4 4.6-.7.9-1.1 1.6-.9 2.6.3 1.4 1.6 2.3 3 2.1 2.2-.3 3.8-2.3 3.5-4.6-.8 1-1.7 1.3-2.4.9C12 4.8 10.2 2.8 8 1.5ZM5.2 7.2c-.6 1.1-.5 2.4.4 3.4 1.2 1.3 3.2 1.5 4.6.5-1.5.9-3.4.6-4.5-.6-1.2-1.3-1.2-3.1-.5-4.4.2.4.3.8.3 1.1Z"
      />
    </svg>
    <!-- 土：层台 -->
    <svg v-else-if="props.wx === '土'" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 12.5h10v1.2H3zm1.4-2.4h7.2v1.2H4.4zm1.5-2.4h4.2v1.2H5.9zM7.2 4.2h1.6v3.2H7.2z"
      />
    </svg>
    <!-- 金：菱锭 -->
    <svg v-else-if="props.wx === '金'" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1.8 13.2 5.2 8 14.2 2.8 5.2 8 1.8Zm0 1.6L4.6 5.4 8 12.2l3.4-6.8L8 3.4Z"
      />
    </svg>
    <!-- 水：双波 -->
    <svg v-else viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        d="M2.5 6.2c1.4 0 1.4-1.4 2.8-1.4S6.7 6.2 8 6.2s1.4-1.4 2.8-1.4 1.4 1.4 2.8 1.4M2.5 10.5c1.4 0 1.4-1.4 2.8-1.4s1.4 1.4 2.8 1.4 1.4-1.4 2.8-1.4 1.4 1.4 2.8 1.4"
      />
    </svg>
  </span>
</template>

<style scoped>
.wx-glyph {
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 50%;
  background: color-mix(in srgb, currentColor 14%, transparent);
}
.wx-glyph[data-wx='木'] {
  color: var(--wx-wood);
}
.wx-glyph[data-wx='火'] {
  color: var(--wx-fire);
}
.wx-glyph[data-wx='土'] {
  color: var(--wx-earth);
}
.wx-glyph[data-wx='金'] {
  color: var(--wx-metal);
}
.wx-glyph[data-wx='水'] {
  color: var(--wx-water);
}
.wx-glyph svg {
  width: 70%;
  height: 70%;
  display: block;
}
</style>
