<script setup lang="ts">
/**
 * 规则页：展示已程序化的八字 / 六爻规则摘要。
 */
import { RULE_DOCS } from '@rules/liuyao/cast'
import { SHISHEN_BRIEF } from '@rules/bazi/shishen'
</script>

<template>
  <div class="page rise">
    <header class="head">
      <h1>规则归纳</h1>
      <p>只收录可编码、可复盘的部分；旺衰细盘、神煞全表等留给你继续学。</p>
    </header>

    <section>
      <h2>八字</h2>
      <ol>
        <li v-for="(t, i) in RULE_DOCS.bazi" :key="i">{{ t }}</li>
      </ol>
    </section>

    <section>
      <h2>六爻</h2>
      <ol>
        <li v-for="(t, i) in RULE_DOCS.liuyao" :key="i">{{ t }}</li>
      </ol>
    </section>

    <section>
      <h2>十神口诀（相对日主）</h2>
      <ul class="grid">
        <li v-for="(text, name) in SHISHEN_BRIEF" :key="name">
          <strong>{{ name }}</strong>
          <span>{{ text }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.head h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 2rem;
  letter-spacing: 0.08em;
}
.head p {
  margin: 8px 0 0;
  color: var(--ink-soft);
  line-height: 1.6;
}
section {
  margin-top: 26px;
  max-width: 52em;
}
h2 {
  margin: 0 0 10px;
  font-family: var(--font-display);
  font-size: 1.25rem;
  color: var(--teal);
}
ol,
ul {
  margin: 0;
  padding-left: 1.2em;
  line-height: 1.8;
  color: var(--ink-soft);
}
.grid {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 10px;
}
.grid li {
  display: grid;
  gap: 4px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}
.grid strong {
  color: var(--ink);
  font-family: var(--font-display);
}
</style>
