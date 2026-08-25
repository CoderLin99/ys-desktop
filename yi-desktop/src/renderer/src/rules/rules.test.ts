import { describe, expect, it } from 'vitest'
import { shishenOf } from './bazi/shishen'
import { buildBaZi, dayPillarIndex, hourGanFromDay, toJulianDay } from './bazi/chart'
import { analyzeBaZiTrend, buildDaYun, judgeStrength } from './bazi/trend'
import { castLiuYao, liuqinOf, bitsToGua } from './liuyao/cast'
import { analyzeLiuYaoTrend } from './liuyao/trend'

describe('十神', () => {
  it('甲日见乙为劫财，见丙为食神', () => {
    expect(shishenOf('甲', '乙')).toBe('劫财')
    expect(shishenOf('甲', '丙')).toBe('食神')
    expect(shishenOf('甲', '戊')).toBe('偏财')
    expect(shishenOf('甲', '庚')).toBe('七杀')
    expect(shishenOf('甲', '壬')).toBe('偏印')
  })
})

describe('八字排盘', () => {
  it('五鼠遁：甲日亥时为乙亥', () => {
    expect(hourGanFromDay('甲', '亥')).toBe('乙')
  })

  it('日柱连续：相邻两日差 1', () => {
    const a = dayPillarIndex(toJulianDay(2000, 1, 1, 12, 0))
    const b = dayPillarIndex(toJulianDay(2000, 1, 2, 12, 0))
    expect((b - a + 60) % 60).toBe(1)
  })

  it('能排出四柱', () => {
    const chart = buildBaZi(1990, 5, 20, 14, 30)
    expect(chart.pillars.day.ganShiShen).toBe('日主')
    expect(chart.pillars.year.gz.length).toBe(2)
    expect(chart.dayMasterWuXing).toBeTruthy()
  })
})

describe('八字走势', () => {
  it('能给出强弱、大运与流年曲线', () => {
    const chart = buildBaZi(1990, 5, 20, 14, 0)
    const strength = judgeStrength(chart)
    expect(['偏弱', '中和', '偏强']).toContain(strength.level)

    const dun = buildDaYun(chart, 'male', 8)
    expect(dun).toHaveLength(8)
    expect(dun[0]).toHaveLength(2)

    const trend = analyzeBaZiTrend(chart, { gender: 'male', fromYear: 2024, yearSpan: 12 })
    expect(trend.years).toHaveLength(12)
    expect(trend.useful.length).toBeGreaterThan(0)
    expect(trend.years[0].score).toBeGreaterThanOrEqual(8)
    expect(trend.years[0].aspects.career).toBeTruthy()
  })
})

describe('六爻', () => {
  it('比特识别乾坤', () => {
    expect(bitsToGua(0b111)).toBe('乾')
    expect(bitsToGua(0b000)).toBe('坤')
  })

  it('六亲：木宫见木为兄弟，见火为子孙', () => {
    expect(liuqinOf('木', '木')).toBe('兄弟')
    expect(liuqinOf('木', '火')).toBe('子孙')
    expect(liuqinOf('木', '土')).toBe('妻财')
    expect(liuqinOf('木', '金')).toBe('官鬼')
    expect(liuqinOf('木', '水')).toBe('父母')
  })

  it('指定爻值起卦，天水讼触发影子提示', () => {
    const r = castLiuYao({ values: [8, 7, 8, 7, 7, 7], dayGan: '甲' })
    expect(r.lower).toBe('坎')
    expect(r.upper).toBe('乾')
    expect(r.shadowFight).toBe(true)
  })

  it('六爻走势能输出近段评分', () => {
    const r = castLiuYao({ values: [8, 7, 8, 7, 7, 7], dayGan: '甲' })
    const t = analyzeLiuYaoTrend(r, 'career')
    expect(t.score).toBeGreaterThanOrEqual(10)
    expect(t.headline).toContain('事业')
    expect(t.shadowLike).toBe(true)
  })
})
