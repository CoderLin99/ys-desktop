import { buildBaZi, type BaZiChart, type Pillar } from "../engine/bazi/chart";
import { collectShenSha, type ShenShaHit } from "../engine/bazi/shensha";
import type { BaziInput } from "../schemas/bazi";

/** 对外柱信息（不含内部推算依据） */
export interface PublicPillar {
  ganZhi: string;
  gan: string;
  zhi: string;
  ganShiShen: string;
  canggan: Array<{ gan: string; shiShen: string; role: string }>;
}

/** 对外神煞（隐藏 rule/basis，降低逆向价值） */
export interface PublicShenSha {
  name: string;
  pillars: Array<"年" | "月" | "日" | "时">;
  tone: "吉" | "中" | "慎";
  brief: string;
}

/** 八字排盘 API 响应 */
export interface BaziChartResult {
  solar: {
    year: number;
    month: number;
    day: number;
    hour: number | null;
    minute: number;
  };
  hourUnknown: boolean;
  dayMaster: string;
  dayMasterWuXing: string;
  pillars: {
    year: PublicPillar;
    month: PublicPillar;
    day: PublicPillar;
    hour: PublicPillar | null;
  };
  shenSha: PublicShenSha[];
  notes: string[];
}

/**
 * 柱结构脱敏：仅保留展示字段。
 * @param pillar 内部柱
 */
function toPublicPillar(pillar: Pillar): PublicPillar {
  return {
    ganZhi: pillar.gz,
    gan: pillar.gan,
    zhi: pillar.zhi,
    ganShiShen: pillar.ganShiShen,
    canggan: pillar.canggan.map((c) => ({
      gan: c.gan,
      shiShen: c.shiShen,
      role: c.role,
    })),
  };
}

/**
 * 神煞脱敏：去掉查法口诀与 basis。
 * @param hit 内部神煞命中
 */
function toPublicShenSha(hit: ShenShaHit): PublicShenSha {
  return {
    name: hit.name,
    pillars: hit.pillars,
    tone: hit.tone,
    brief: hit.brief,
  };
}

/**
 * 完整八字排盘（服务端专用，算法不进入前端 bundle）。
 * @param input 公历输入
 */
export function buildBaziChart(input: BaziInput): BaziChartResult {
  const chart: BaZiChart = buildBaZi(
    input.year,
    input.month,
    input.day,
    input.hour ?? null,
    input.minute ?? 0,
    { dayCutover: input.dayCutover },
  );

  const shenSha = collectShenSha(chart);

  return {
    solar: chart.solar,
    hourUnknown: chart.hourUnknown,
    dayMaster: chart.dayMaster,
    dayMasterWuXing: chart.dayMasterWuXing,
    pillars: {
      year: toPublicPillar(chart.pillars.year),
      month: toPublicPillar(chart.pillars.month),
      day: toPublicPillar(chart.pillars.day),
      hour: chart.pillars.hour ? toPublicPillar(chart.pillars.hour) : null,
    },
    shenSha: shenSha.map(toPublicShenSha),
    notes: chart.notes,
  };
}
