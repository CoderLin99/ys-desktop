<script setup lang="ts">
/**
 * 规则/学堂页：书城式古籍阅览（分类）+ 方法论 + 十神神煞。
 */
import { computed, onMounted, ref } from 'vue'
import { RULE_DOCS } from '@rules/liuyao/cast'
import { SHISHEN_BRIEF } from '@rules/bazi/shishen'
import { SHENSHA_DOCS } from '@rules/bazi/shensha'
import { CLASSIC_INFERENCE_NOTE, groupClassicBooksBySchool } from '@rules/bazi/classics'
import { METHODOLOGY_SECTIONS, CHART_QUALITY_GATES } from '@rules/bazi/methodologyGuide'
import {
  CLASSIC_STORE_CATEGORIES,
  listClassicLibraryBooks,
  loadClassicBookChapters,
  type ClassicLibraryBook,
  type ClassicLibraryChapter,
  type ClassicStoreCategory
} from '@rules/classics/library'

/** 按八字 / 跨体系 / 紫微等分组的书库摘要 */
const bookGroups = groupClassicBooksBySchool()

/** 已收录书目 */
const libraryBooks = ref<ClassicLibraryBook[]>([])
/** 列表加载中 */
const libraryLoading = ref(false)
/** 列表错误 */
const libraryError = ref('')
/** 检索 */
const bookFilter = ref('')
/** 当前分类；all=全部 */
const activeCategory = ref<ClassicStoreCategory | 'all'>('all')
/** 当前打开的书 id */
const activeBookId = ref<string | null>(null)
/** 当前书章节 */
const activeChapters = ref<ClassicLibraryChapter[]>([])
/** 当前展示书名 */
const activeBookTitle = ref('')
/** 当前分类标签 */
const activeBookCategory = ref('')
/** 当前章节下标 */
const activeChapterIndex = ref(0)
/** 正文加载中 */
const readingLoading = ref(false)

/** 各分类数量（含全部） */
const categoryCounts = computed(() => {
  const map: Record<string, number> = { all: libraryBooks.value.length }
  for (const b of libraryBooks.value) {
    map[b.category] = (map[b.category] || 0) + 1
  }
  return map
})

/** 书城可见书目 */
const storeBooks = computed(() => {
  const q = bookFilter.value.trim()
  return libraryBooks.value.filter((b) => {
    if (activeCategory.value !== 'all' && b.category !== activeCategory.value) return false
    if (!q) return true
    return (
      b.displayTitle.includes(q) ||
      b.title.includes(q) ||
      b.id.includes(q) ||
      b.categoryLabel.includes(q)
    )
  })
})

/** 当前章 */
const activeChapter = computed(() => activeChapters.value[activeChapterIndex.value] || null)

/**
 * 加载书目。
 */
async function loadLibrary(): Promise<void> {
  libraryLoading.value = true
  libraryError.value = ''
  try {
    libraryBooks.value = await listClassicLibraryBooks()
    if (!libraryBooks.value.length) {
      libraryError.value = '未找到离线书库索引。请先构建 classics-index。'
    }
  } catch (e) {
    libraryError.value = e instanceof Error ? e.message : String(e)
  } finally {
    libraryLoading.value = false
  }
}

/**
 * 切换分类。
 * @param id 分类
 */
function selectCategory(id: ClassicStoreCategory | 'all'): void {
  activeCategory.value = id
}

/**
 * 打开一书。
 * @param book 书目
 */
async function openBook(book: ClassicLibraryBook): Promise<void> {
  readingLoading.value = true
  activeBookId.value = book.id
  activeBookTitle.value = book.displayTitle
  activeBookCategory.value = book.categoryLabel
  activeChapterIndex.value = 0
  try {
    const packed = await loadClassicBookChapters(book.id)
    activeChapters.value = packed?.chapters || []
    activeBookTitle.value = packed?.displayTitle || book.displayTitle
  } finally {
    readingLoading.value = false
  }
}

/**
 * 关闭阅览。
 */
function closeReader(): void {
  activeBookId.value = null
  activeChapters.value = []
  activeChapterIndex.value = 0
  activeBookCategory.value = ''
}

/**
 * 切章。
 * @param idx 下标
 */
function selectChapter(idx: number): void {
  activeChapterIndex.value = idx
}

/**
 * 封面竖排书名（最多 8 字）。
 * @param title 展示书名
 */
function coverSpine(title: string): string {
  return title.replace(/\s/g, '').slice(0, 8)
}

onMounted(() => {
  void loadLibrary()
})
</script>

<template>
  <div class="page rise">
    <header class="head">
      <h1>规则 · 学堂</h1>
      <p>
        <strong>古籍书城</strong>可按分类阅览已收录原文；亦可查看子平成法摘要、读盘方法论与神煞口诀。神煞仅作辅证。
      </p>
      <p class="soft book-note">{{ CLASSIC_INFERENCE_NOTE }}</p>
    </header>

    <section class="bookstore">
      <div class="store-head">
        <h2>古籍书城</h2>
        <p class="soft">离线书库共 {{ libraryBooks.length }} 种 · 点封面进入阅读</p>
      </div>

      <p v-if="libraryLoading" class="soft">正在载入书目…</p>
      <p v-else-if="libraryError" class="err">{{ libraryError }}</p>

      <template v-else-if="!activeBookId">
        <div class="store-toolbar">
          <nav class="cat-nav" aria-label="书城分类">
            <button
              v-for="c in CLASSIC_STORE_CATEGORIES"
              :key="c.id"
              type="button"
              class="cat-chip"
              :class="{ on: activeCategory === c.id }"
              @click="selectCategory(c.id)"
            >
              {{ c.label }}
              <span class="cnt">{{ categoryCounts[c.id] || 0 }}</span>
            </button>
          </nav>
          <label class="filter">
            搜书
            <input v-model="bookFilter" type="search" placeholder="书名 / 分类" />
          </label>
        </div>

        <div class="shelf">
          <div class="shelf-grid">
            <button
              v-for="b in storeBooks"
              :key="b.id"
              type="button"
              class="book"
              :data-cat="b.category"
              :title="`${b.displayTitle} · ${b.categoryLabel}`"
              @click="openBook(b)"
            >
              <!-- 立体书：书脊 + 封面 + 页边 -->
              <span class="book-3d" aria-hidden="true">
                <span class="book-spine">
                  <span class="spine-text">{{ coverSpine(b.displayTitle) }}</span>
                </span>
                <span class="book-face">
                  <span class="face-ornament" />
                  <span class="face-title">{{ b.displayTitle }}</span>
                  <span class="face-cat">{{ b.categoryLabel }}</span>
                  <span class="face-meta">{{ b.chapterCount }} 章</span>
                  <span class="face-ornament bottom" />
                </span>
                <span class="book-pages" />
              </span>
              <span class="book-caption">{{ b.displayTitle }}</span>
            </button>
          </div>
          <div class="shelf-plank" aria-hidden="true" />
        </div>
        <p v-if="!storeBooks.length" class="soft">本分类暂无匹配书目。</p>
      </template>

      <div v-else class="reader">
        <div class="reader-bar">
          <button type="button" class="ghost" @click="closeReader">← 返回书城</button>
          <div class="reader-title">
            <h3>{{ activeBookTitle }}</h3>
            <span v-if="activeBookCategory" class="cat-tag">{{ activeBookCategory }}</span>
          </div>
        </div>
        <p v-if="readingLoading" class="soft">载入正文…</p>
        <div v-else class="reader-body">
          <aside class="toc">
            <button
              v-for="(ch, i) in activeChapters"
              :key="ch.title + i"
              type="button"
              class="toc-item"
              :class="{ on: i === activeChapterIndex }"
              @click="selectChapter(i)"
            >
              {{ ch.title }}
            </button>
          </aside>
          <article v-if="activeChapter" class="chapter">
            <h4>{{ activeChapter.title }}</h4>
            <p v-for="(p, i) in activeChapter.paragraphs" :key="i" class="para">{{ p }}</p>
          </article>
          <p v-else class="soft">本章无正文。</p>
        </div>
      </div>
    </section>

    <section class="methodology">
      <h2>读盘方法论</h2>
      <p class="soft">
        报告拆为四柱日主、五行平衡、十神、神煞、大运、格局六层；下列卡片说明要义与本程序对应实现。
      </p>
      <div class="method-grid">
        <article v-for="m in METHODOLOGY_SECTIONS" :key="m.id" class="method-card">
          <h3>{{ m.title }}</h3>
          <p class="gist">{{ m.gist }}</p>
          <p class="align"><strong>读盘要点：</strong>{{ m.keyPoints }}</p>
          <ul>
            <li v-for="(line, i) in m.ourImpl" :key="i">{{ line }}</li>
          </ul>
        </article>
      </div>
      <h3 class="gates-title">排盘五关（准确命盘前置条件）</h3>
      <ol class="gates">
        <li v-for="(g, i) in CHART_QUALITY_GATES" :key="i">{{ g }}</li>
      </ol>
    </section>

    <section>
      <h2>经典归纳（义理摘要）</h2>
      <div v-for="g in bookGroups" :key="g.school" class="school-block">
        <h3 class="school-title">{{ g.label }}</h3>
        <div class="books">
          <article v-for="b in g.books" :key="b.id" class="book">
            <h4>{{ b.title }}</h4>
            <p class="focus">{{ b.focus }}</p>
            <ul>
              <li v-for="(p, i) in b.points" :key="i">{{ p }}</li>
            </ul>
            <p class="tags">
              <span v-for="t in b.tags" :key="t">{{ t }}</span>
            </p>
          </article>
        </div>
      </div>
    </section>

    <section>
      <h2>八字（本程序已编码）</h2>
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

    <section>
      <h2>神煞全库（程序口诀）</h2>
      <p class="soft">
        教学查表（常见口诀归纳），与各派神煞专论可能略有出入；神煞仅作辅证。离线书库收有《神煞大全》，可在上方书城「神煞专论」中查阅。
      </p>
      <ul class="grid">
        <li v-for="s in SHENSHA_DOCS" :key="s.name">
          <strong>{{ s.name }}</strong>
          <span>{{ s.rule }} — {{ s.brief }}</span>
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
  max-width: 46em;
}
.book-note {
  margin-top: 10px;
}
.soft {
  color: var(--ink-soft);
  line-height: 1.55;
}
.err {
  color: var(--seal);
}
.bookstore {
  margin-top: 26px;
  max-width: 76em;
}
.store-head h2 {
  margin: 0 0 4px;
  font-family: var(--font-display);
}
.store-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 18px;
  align-items: flex-end;
  margin: 14px 0 16px;
}
.cat-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}
.cat-chip {
  border: 1px solid var(--line);
  background: var(--surface-solid);
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  color: var(--ink-soft);
  font-size: 0.86rem;
}
.cat-chip.on {
  border-color: var(--teal);
  color: var(--ink);
  background: color-mix(in srgb, var(--teal) 14%, var(--surface-solid));
}
.cat-chip .cnt {
  margin-left: 4px;
  opacity: 0.7;
  font-size: 0.78rem;
}
.filter {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: var(--ink-soft);
  min-width: 200px;
}
.filter input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--input-bg);
  font-size: 16px;
}
.shelf {
  position: relative;
  margin-bottom: 8px;
}
.shelf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  gap: 22px 18px;
  align-items: end;
  padding: 8px 6px 0;
  perspective: 900px;
}
.shelf-plank {
  height: 14px;
  margin-top: -2px;
  border-radius: 2px 2px 6px 6px;
  background: linear-gradient(180deg, #8b6a45 0%, #6a4e32 45%, #4a3520 100%);
  box-shadow:
    0 4px 0 #3a2818,
    0 8px 16px color-mix(in srgb, var(--ink) 18%, transparent);
}
.book {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: inherit;
  min-height: var(--touch-min);
  min-width: 0;
}
.book:hover .book-3d {
  transform: translateY(-10px) rotateY(-8deg);
}
.book:focus-visible .book-3d {
  outline: 2px solid var(--teal);
  outline-offset: 4px;
}
.book-3d {
  position: relative;
  width: 92px;
  height: 138px;
  transform-style: preserve-3d;
  transition: transform 0.28s ease;
  filter: drop-shadow(4px 8px 10px color-mix(in srgb, var(--ink) 28%, transparent));
}
.book-spine {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 14px;
  display: grid;
  place-items: center;
  border-radius: 3px 0 0 3px;
  background: linear-gradient(90deg, #3a2418, #5c3d2e 40%, #4a3020);
  box-shadow: inset -2px 0 0 rgba(0, 0, 0, 0.25);
  z-index: 2;
}
.spine-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-family: var(--font-display);
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  color: var(--on-deep);
  max-height: 118px;
  overflow: hidden;
}
.book-face {
  position: absolute;
  inset: 0 6px 0 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 8px;
  border-radius: 0 5px 5px 0;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.12), transparent 40%),
    linear-gradient(180deg, #5c3d2e, #3a2418);
  color: var(--on-deep);
  text-align: center;
  z-index: 1;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}
.face-ornament {
  width: 70%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(243, 231, 200, 0.55), transparent);
}
.face-ornament.bottom {
  margin-top: auto;
}
.face-title {
  font-family: var(--font-display);
  font-size: 0.82rem;
  line-height: 1.35;
  letter-spacing: 0.06em;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.face-cat {
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  opacity: 0.78;
}
.face-meta {
  font-size: 0.62rem;
  opacity: 0.65;
}
.book-pages {
  position: absolute;
  top: 3px;
  right: 0;
  bottom: 3px;
  width: 7px;
  border-radius: 0 2px 2px 0;
  background: repeating-linear-gradient(
    180deg,
    #f4efe6 0px,
    #f4efe6 2px,
    #e0d6c8 2px,
    #e0d6c8 3px
  );
  box-shadow: 1px 0 0 rgba(0, 0, 0, 0.12);
  z-index: 0;
}
.book-caption {
  max-width: 100px;
  font-size: 0.72rem;
  line-height: 1.3;
  color: var(--ink-soft);
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.book[data-cat='ziping'] .book-spine {
  background: linear-gradient(90deg, #2a1c12, #5c3d2e 45%, #4a3020);
}
.book[data-cat='ziping'] .book-face {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.1), transparent 42%),
    linear-gradient(180deg, #6b4a32, #3d2818);
}
.book[data-cat='shensha'] .book-spine {
  background: linear-gradient(90deg, #2a1212, #6b3a3a 45%, #4a2222);
}
.book[data-cat='shensha'] .book-face {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.1), transparent 42%),
    linear-gradient(180deg, #7a4040, #3a1f1f);
}
.book[data-cat='ziwei'] .book-spine {
  background: linear-gradient(90deg, #121828, #3d4a6b 45%, #1f273a);
}
.book[data-cat='ziwei'] .book-face {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.1), transparent 42%),
    linear-gradient(180deg, #4a5a82, #1f273a);
}
.book[data-cat='yangzhai'] .book-spine {
  background: linear-gradient(90deg, #122018, #3d5c45 45%, #1f3326);
}
.book[data-cat='yangzhai'] .book-face {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.1), transparent 42%),
    linear-gradient(180deg, #4a7055, #1f3326);
}
.book[data-cat='yinzhai'] .book-spine {
  background: linear-gradient(90deg, #1a1a1a, #4a4a4a 45%, #262626);
}
.book[data-cat='yinzhai'] .book-face {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.08), transparent 42%),
    linear-gradient(180deg, #555, #262626);
}
.book[data-cat='other'] .book-spine {
  background: linear-gradient(90deg, #1c2420, #3d5548 45%, #24332c);
}
.book[data-cat='other'] .book-face {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.1), transparent 42%),
    linear-gradient(180deg, #4a6558, #24332c);
}
@media (max-width: 520px) {
  .shelf-grid {
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 16px 12px;
  }
  .book-3d {
    width: 80px;
    height: 120px;
  }
}
.reader-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.reader-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.reader-bar h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
}
.cat-tag {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--line);
  color: var(--ink-soft);
}
.ghost {
  border: 1px solid var(--line);
  background: var(--surface-strong);
  border-radius: 999px;
  padding: 8px 14px;
  cursor: pointer;
  color: var(--ink-soft);
}
.reader-body {
  display: grid;
  grid-template-columns: minmax(140px, 220px) 1fr;
  gap: 14px;
  min-height: 320px;
}
.toc {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: min(60vh, 560px);
  overflow: auto;
  padding-right: 4px;
}
.toc-item {
  text-align: left;
  border: none;
  background: transparent;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--ink-soft);
  font-size: 0.86rem;
}
.toc-item.on,
.toc-item:hover {
  background: color-mix(in srgb, var(--teal) 12%, transparent);
  color: var(--ink);
}
.chapter {
  padding: 8px 4px 24px;
  max-height: min(70vh, 720px);
  overflow: auto;
}
.chapter h4 {
  margin: 0 0 12px;
  font-family: var(--font-display);
}
.para {
  margin: 0 0 0.9em;
  line-height: 1.85;
  color: var(--ink);
  font-size: 0.98rem;
}
.methodology {
  margin-top: 36px;
}
.method-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}
.method-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
  background: var(--surface-solid);
}
.method-card h3 {
  margin: 0 0 6px;
  font-size: 1rem;
}
.gist,
.align {
  margin: 0 0 8px;
  color: var(--ink-soft);
  font-size: 0.9rem;
  line-height: 1.55;
}
.method-card ul {
  margin: 0;
  padding-left: 1.1em;
  color: var(--ink-soft);
  font-size: 0.86rem;
}
.gates-title {
  margin: 18px 0 8px;
  font-size: 1rem;
}
.gates {
  margin: 0;
  padding-left: 1.2em;
  color: var(--ink-soft);
  line-height: 1.6;
}
.school-block {
  margin-top: 16px;
}
.school-title {
  margin: 0 0 8px;
}
.books {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}
.book {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px;
  background: var(--surface-solid);
}
.book h4 {
  margin: 0 0 6px;
  font-family: var(--font-display);
}
.focus {
  margin: 0 0 8px;
  color: var(--ink-soft);
  font-size: 0.88rem;
}
.book ul {
  margin: 0;
  padding-left: 1.1em;
  color: var(--ink-soft);
  font-size: 0.85rem;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0 0;
}
.tags span {
  font-size: 0.72rem;
  padding: 2px 6px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--gold) 22%, transparent);
}
.grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}
.grid li {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 12px;
  display: grid;
  gap: 4px;
  background: var(--surface-solid);
}
.grid span {
  color: var(--ink-soft);
  font-size: 0.86rem;
  line-height: 1.45;
}
@media (max-width: 720px) {
  .reader-body {
    grid-template-columns: 1fr;
  }
  .toc {
    max-height: 160px;
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
