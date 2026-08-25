<script setup lang="ts">
/**
 * 首页：品牌英雄区 + 两个入口（不做仪表盘堆砌）。
 */
</script>

<template>
  <section class="hero rise">
    <p class="eyebrow">YI DESKTOP</p>
    <h1>易学桌面</h1>
    <p class="lead">
      把八字十神与六爻起卦里「可编码的规则」收成程序：先排盘、再对照，少跟影子打架。
    </p>
    <div class="cta">
      <router-link class="btn primary" to="/bazi">排八字</router-link>
      <router-link class="btn ghost" to="/liuyao">起六爻</router-link>
    </div>
    <div class="hero-visual" aria-hidden="true">
      <div class="orb" />
      <div class="stroke" />
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 640px;
  padding-bottom: 48px;
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
  font-size: clamp(3rem, 7vw, 4.6rem);
  font-weight: 400;
  letter-spacing: 0.12em;
  line-height: 1;
}

.lead {
  margin: 18px 0 0;
  font-size: 1.05rem;
  line-height: 1.7;
  color: var(--ink-soft);
  max-width: 32em;
}

.cta {
  display: flex;
  gap: 12px;
  margin-top: 28px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
  padding: 12px 20px;
  border-radius: 999px;
  border: 1px solid transparent;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.btn:hover {
  transform: translateY(-2px);
}

.btn.primary {
  background: var(--seal);
  color: #fff8f4;
  box-shadow: 0 10px 28px rgba(181, 64, 42, 0.28);
}

.btn.ghost {
  border-color: var(--ink);
  background: transparent;
}

.hero-visual {
  position: absolute;
  right: -18%;
  top: 18%;
  width: min(420px, 48vw);
  height: min(420px, 48vw);
  pointer-events: none;
}

.orb {
  position: absolute;
  inset: 12%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.55), transparent 35%),
    radial-gradient(circle at 60% 70%, rgba(31, 111, 91, 0.45), rgba(20, 35, 28, 0.85));
  filter: blur(0.2px);
  animation: ink-pulse 7s ease-in-out infinite;
}

.stroke {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(20, 35, 28, 0.18);
  transform: rotate(12deg);
  animation: rise-in 1s ease both;
}

@media (max-width: 900px) {
  .hero-visual {
    opacity: 0.35;
    right: -10%;
  }
}
</style>
