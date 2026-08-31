<script setup lang="ts">
/**
 * 出生地三级滑动选择：国内 省→市→区；国外 国家→城市→分区。
 * 顶部搜索直接命中区县/城市并跳转滚轮。
 */
import { computed, ref, watch } from 'vue'
import {
  BIRTH_PLACE_SCOPE_OPTIONS,
  CUSTOM_PLACE_KEY,
  PLACE_CITYWIDE,
  birthPlaceId,
  cascadePathOf,
  filterBirthPlaces,
  findBirthPlaceById,
  formatPlaceLabel,
  listPlaceLevel1,
  listPlaceLevel2,
  listPlaceLevel3,
  pickBirthPlaceByQuery,
  resolveCascadePlace,
  type BirthPlace,
  type BirthPlaceScope
} from '@rules/bazi/solarTime'

const props = withDefaults(
  defineProps<{
    /** 国内 / 国外 */
    scope?: BirthPlaceScope
    /** birthPlaceId 或自定义哨兵 */
    modelValue: string
  }>(),
  { scope: 'cn' }
)

const emit = defineEmits<{
  'update:scope': [BirthPlaceScope]
  'update:modelValue': [string]
  /** 选中地点变化（自定义时为 null） */
  change: [BirthPlace | null]
}>()

const scopeLocal = computed({
  get: () => props.scope,
  set: (v: BirthPlaceScope) => emit('update:scope', v)
})

/** 搜索框 */
const query = ref('')
/** 三级路径 */
const level1 = ref('')
const level2 = ref('')
const level3Id = ref(PLACE_CITYWIDE)

const level1Options = computed(() => listPlaceLevel1(scopeLocal.value))
const level2Options = computed(() =>
  level1.value ? listPlaceLevel2(scopeLocal.value, level1.value) : []
)
const level3Options = computed(() =>
  level1.value && level2.value
    ? listPlaceLevel3(scopeLocal.value, level1.value, level2.value)
    : []
)

/** 搜索命中列表（直达） */
const searchHits = computed(() => {
  const q = query.value.trim()
  if (!q) return [] as BirthPlace[]
  return filterBirthPlaces(q, scopeLocal.value).slice(0, 12)
})

/**
 * 把地点写回 v-model 并同步滚轮。
 * @param p 地点；null=自定义
 */
function commitPlace(p: BirthPlace | null): void {
  if (!p) {
    emit('update:modelValue', CUSTOM_PLACE_KEY)
    emit('change', null)
    return
  }
  const path = cascadePathOf(p)
  level1.value = path.level1
  level2.value = path.level2
  level3Id.value = path.level3Id
  emit('update:modelValue', birthPlaceId(p))
  emit('change', p)
}

/**
 * 从当前滚轮解析并提交。
 */
function commitFromWheels(): void {
  if (props.modelValue === CUSTOM_PLACE_KEY) return
  const p = resolveCascadePlace(scopeLocal.value, level1.value, level2.value, level3Id.value)
  if (!p) return
  const id = birthPlaceId(p)
  if (id !== props.modelValue) emit('update:modelValue', id)
  emit('change', p)
}

/**
 * 搜索结果点击：直接命中。
 * @param p 地点
 */
function pickHit(p: BirthPlace): void {
  query.value = ''
  scopeLocal.value = p.scope === 'intl' ? 'intl' : 'cn'
  commitPlace(p)
}

/**
 * 搜索框回车：取最优一条。
 */
function onSearchEnter(): void {
  const hit = pickBirthPlaceByQuery(query.value, scopeLocal.value)
  if (hit) pickHit(hit)
}

/**
 * 切到自定义经度。
 */
function useCustom(): void {
  query.value = ''
  commitPlace(null)
}

/**
 * 用外部 modelValue 回填滚轮。
 */
function syncFromModel(): void {
  if (props.modelValue === CUSTOM_PLACE_KEY) return
  const p = findBirthPlaceById(props.modelValue, scopeLocal.value)
  if (!p) {
    // 兜底：范围首省首市
    const l1 = listPlaceLevel1(scopeLocal.value)[0]
    if (!l1) return
    level1.value = l1
    level2.value = listPlaceLevel2(scopeLocal.value, l1)[0] ?? ''
    level3Id.value = listPlaceLevel3(scopeLocal.value, level1.value, level2.value)[0]?.id ?? PLACE_CITYWIDE
    commitFromWheels()
    return
  }
  const path = cascadePathOf(p)
  level1.value = path.level1
  level2.value = path.level2
  level3Id.value = path.level3Id
}

watch(
  () => [props.modelValue, props.scope] as const,
  () => syncFromModel(),
  { immediate: true }
)

watch(level1, (l1) => {
  const cities = listPlaceLevel2(scopeLocal.value, l1)
  if (!cities.includes(level2.value)) level2.value = cities[0] ?? ''
})

watch([level2, level1], () => {
  const opts = listPlaceLevel3(scopeLocal.value, level1.value, level2.value)
  if (!opts.some((o) => o.id === level3Id.value)) {
    level3Id.value = opts[0]?.id ?? PLACE_CITYWIDE
  }
})

watch([level1, level2, level3Id], () => commitFromWheels())

watch(scopeLocal, () => {
  if (props.modelValue === CUSTOM_PLACE_KEY) return
  const l1 = listPlaceLevel1(scopeLocal.value)[0]
  level1.value = l1 ?? ''
  level2.value = l1 ? listPlaceLevel2(scopeLocal.value, l1)[0] ?? '' : ''
  level3Id.value =
    listPlaceLevel3(scopeLocal.value, level1.value, level2.value)[0]?.id ?? PLACE_CITYWIDE
  commitFromWheels()
})

/** 当前展示摘要 */
const summary = computed(() => {
  if (props.modelValue === CUSTOM_PLACE_KEY) return '自定义经度'
  const p = findBirthPlaceById(props.modelValue, scopeLocal.value)
  return p ? formatPlaceLabel(p) : '尚未选择'
})
</script>

<template>
  <div class="place-picker">
    <div class="scope-row" role="group" aria-label="国内或国外">
      <button
        v-for="opt in BIRTH_PLACE_SCOPE_OPTIONS"
        :key="opt.value"
        type="button"
        :class="{ on: scopeLocal === opt.value }"
        @click="scopeLocal = opt.value"
      >
        {{ opt.label }}
      </button>
      <button type="button" class="custom" :class="{ on: modelValue === CUSTOM_PLACE_KEY }" @click="useCustom">
        自定义经度
      </button>
    </div>

    <div class="search-row">
      <input
        v-model="query"
        type="search"
        :placeholder="
          scopeLocal === 'cn' ? '可搜省 / 市 / 区，例如泉港' : '可搜国家 / 城市，例如 Tokyo'
        "
        autocomplete="off"
        @keydown.enter.prevent="onSearchEnter"
      />
    </div>
    <ul v-if="searchHits.length" class="hits" role="listbox">
      <li v-for="h in searchHits" :key="birthPlaceId(h)">
        <button type="button" @click="pickHit(h)">{{ formatPlaceLabel(h) }}</button>
      </li>
    </ul>

    <template v-if="modelValue !== CUSTOM_PLACE_KEY">
      <p class="hint">可滑动选择 · 当前：{{ summary }}</p>
      <div class="wheels">
        <label class="col">
          <span class="lab">{{ scopeLocal === 'cn' ? '省' : '国家' }}</span>
          <select v-model="level1" class="wheel" aria-label="一级行政区">
            <option v-for="n in level1Options" :key="n" :value="n">{{ n }}</option>
          </select>
        </label>
        <label class="col">
          <span class="lab">{{ scopeLocal === 'cn' ? '市' : '城市' }}</span>
          <select v-model="level2" class="wheel" aria-label="二级行政区">
            <option v-for="n in level2Options" :key="n" :value="n">{{ n }}</option>
          </select>
        </label>
        <label class="col">
          <span class="lab">{{ scopeLocal === 'cn' ? '区县' : '分区' }}</span>
          <select v-model="level3Id" class="wheel" aria-label="三级行政区">
            <option v-for="o in level3Options" :key="o.id" :value="o.id">{{ o.label }}</option>
          </select>
        </label>
      </div>
    </template>
  </div>
</template>

<style scoped>
.place-picker {
  display: grid;
  gap: 10px;
  width: 100%;
  min-width: min(100%, 280px);
  padding: 12px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--gold) 26%, var(--line));
  background:
    radial-gradient(ellipse 80% 60% at 100% 0%, color-mix(in srgb, var(--teal) 10%, transparent), transparent 55%),
    var(--surface-solid);
  box-shadow: 0 8px 22px color-mix(in srgb, var(--ink) 6%, transparent);
}
.scope-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.scope-row button {
  border: 1px solid var(--line);
  background: var(--surface-strong);
  color: var(--ink-soft);
  border-radius: 999px;
  padding: 6px 12px;
  font: inherit;
  cursor: pointer;
  min-height: 36px;
}
.scope-row button.on {
  background: linear-gradient(135deg, var(--teal), color-mix(in srgb, var(--teal) 70%, var(--gold)));
  color: var(--on-accent);
  border-color: transparent;
  font-weight: 600;
}
.scope-row .custom.on {
  background: linear-gradient(135deg, var(--gold), color-mix(in srgb, var(--gold) 70%, var(--seal)));
  color: var(--on-accent);
}
.search-row input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--input-bg);
  color: var(--ink);
  min-height: var(--touch-min);
}
.hits {
  list-style: none;
  margin: 0;
  padding: 4px;
  max-height: 160px;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface-solid);
}
.hits button {
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--ink);
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
}
.hits button:hover {
  background: color-mix(in srgb, var(--teal) 14%, transparent);
}
.hint {
  margin: 0;
  font-size: 0.78rem;
  color: var(--ink-soft);
}
.wheels {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 8px 6px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--paper-deep) 50%, var(--surface-solid));
}
.col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.lab {
  font-size: 0.68rem;
  color: var(--muted);
  letter-spacing: 0.12em;
  text-align: center;
}
.wheel {
  width: 100%;
  min-height: 44px;
  padding: 8px 4px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: var(--surface-solid);
  color: var(--ink);
  font-size: 0.92rem;
  text-align: center;
  box-shadow: 0 1px 0 color-mix(in srgb, var(--ink) 6%, transparent);
}
.wheel:focus {
  border-color: color-mix(in srgb, var(--teal) 45%, var(--line));
  outline: none;
}
@media (max-width: 420px) {
  .wheels {
    grid-template-columns: 1fr;
  }
}
</style>
