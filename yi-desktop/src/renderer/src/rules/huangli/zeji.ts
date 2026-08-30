/**
 * 黄历择吉：按事项在日期范围内筛「宜」含该事项的日子。
 */
import { buildHuangliDay, type HuangliDay } from './day'
import { plainYiJi } from './plain'

/** 择吉事项（对应黄历「宜」常见词） */
export interface ZeJiMatter {
  /** 事项 id */
  id: string
  /** 展示名 */
  label: string
  /** 匹配宜忌原词（任一命中即可） */
  yiKeys: string[]
}

/** 内置择吉事项表 */
export const ZEJI_MATTERS: ZeJiMatter[] = [
  { id: '婚嫁', label: '婚嫁登记', yiKeys: ['嫁娶', '订盟', '纳采', '结婚'] },
  { id: '开业', label: '开业开市', yiKeys: ['开市', '开业', '立券', '交易'] },
  { id: '搬家', label: '搬家入宅', yiKeys: ['移徙', '入宅', '安香', '安床'] },
  { id: '动土', label: '装修动土', yiKeys: ['动土', '破土', '修造', '竖柱', '上梁'] },
  { id: '出行', label: '出行远行', yiKeys: ['出行', '移徙', '赴任'] },
  { id: '签约', label: '签约交易', yiKeys: ['立券', '交易', '纳财', '开市'] },
  { id: '求医', label: '求医手术', yiKeys: ['治疗', '针灸', '求医疗病'] },
  { id: '祈福', label: '祈福祭祀', yiKeys: ['祭祀', '祈福', '开光', '求嗣'] }
]

/** 单日择吉命中 */
export interface ZeJiHit {
  /** 公历 Y-M-D */
  solarLabel: string
  /** 农历简述 */
  lunarLabel: string
  /** 日干支 */
  dayGz: string
  /** 命中的宜条目（原词） */
  matchedYi: string[]
  /** 白话提示 */
  plainTips: string[]
  /** 完整黄历（可选展开） */
  day: HuangliDay
}

/**
 * 在 [from, from+days) 范围内筛选宜含指定事项的日子。
 * @param matterId 事项 id（见 ZEJI_MATTERS）
 * @param from 起始公历日
 * @param dayCount 向后扫描天数（含起始日），默认 60
 */
export function scanZeJiDays(
  matterId: string,
  from: Date,
  dayCount = 60
): ZeJiHit[] {
  const matter = ZEJI_MATTERS.find((m) => m.id === matterId)
  if (!matter) return []
  const hits: ZeJiHit[] = []
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const dayNum = d.getDate()
    const hl = buildHuangliDay(y, m, dayNum)
    const matchedYi = hl.yi.filter((term) =>
      matter.yiKeys.some((k) => term.includes(k) || k.includes(term))
    )
    if (!matchedYi.length) continue
    hits.push({
      solarLabel: hl.solarLabel,
      lunarLabel: hl.lunarLabel,
      dayGz: hl.dayGz,
      matchedYi,
      plainTips: matchedYi.map((t) => plainYiJi(t)),
      day: hl
    })
  }
  return hits
}
