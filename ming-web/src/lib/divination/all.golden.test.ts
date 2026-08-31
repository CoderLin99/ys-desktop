/**
 * 全工具服务端引擎黄金 / 冒烟测试。
 */
import { describe, expect, it } from "vitest";
import { buildBaziChart } from "@/lib/divination/adapters/bazi";
import { buildZiWeiChartPublic } from "@/lib/divination/adapters/ziwei";
import { buildLiuYaoChart } from "@/lib/divination/adapters/liuyao";
import {
  buildHuangliDayPublic,
  buildHuangliZejiPublic,
} from "@/lib/divination/adapters/huangli";
import { buildFengShuiChart } from "@/lib/divination/adapters/fengshui";
import {
  BAZI_GOLDEN_CASES,
  BAZI_SHENSHA_GOLDEN_CASES,
  ZIWEI_GOLDEN_CASES,
} from "@/lib/divination/engine/golden/cases";
import {
  assertBaZiGoldenCase,
  assertBaZiMatchesEightCharDirect,
} from "@/lib/divination/engine/golden/compareBazi";
import { assertShenShaGoldenCase } from "@/lib/divination/engine/golden/compareShenSha";
import {
  assertZiWeiMajorStarsMatchIztro,
  assertZiWeiSoulBodyMatchesIztro,
  compareZiWeiWithIztro,
} from "@/lib/divination/engine/golden/compareZiWei";
import {
  buildZiWeiChart,
  calcTianFuIndex,
  calcWuXingJu,
  calcZiWeiIndex,
} from "@/lib/divination/engine/ziwei/chart";
import { bitsToGua, liuqinOf } from "@/lib/divination/engine/liuyao/cast";

describe("八字 · 四柱", () => {
  it.each(BAZI_GOLDEN_CASES)("$label", (c) => {
    assertBaZiGoldenCase(c);
  });

  it.each(BAZI_GOLDEN_CASES.filter((c) => c.hour !== null))(
    "$label EightChar 直取",
    (c) => {
      assertBaZiMatchesEightCharDirect(c);
    },
  );
});

describe("八字 · 神煞", () => {
  it.each(BAZI_SHENSHA_GOLDEN_CASES)("$label", (c) => {
    assertShenShaGoldenCase(c);
  });
});

describe("八字 · API 脱敏", () => {
  it("不含 rule/basis", () => {
    const result = buildBaziChart({
      year: 1999,
      month: 6,
      day: 29,
      hour: 7,
      minute: 20,
      dayCutover: "ziZheng",
    });
    const json = JSON.stringify(result);
    expect(json).not.toContain('"rule"');
    expect(json).not.toContain('"basis"');
  });
});

describe("紫微 · 单元算法", () => {
  it("丁亥命宫 → 土五局", () => {
    expect(calcWuXingJu("丁", "亥")).toBe("土五局");
  });

  it("7 日土五局 → 紫微在子", () => {
    expect(calcZiWeiIndex(7, 5)).toBe(0);
    expect(calcTianFuIndex(0)).toBe(4);
  });
});

describe("紫微 · 结构", () => {
  it.each(ZIWEI_GOLDEN_CASES)("$label 十二宫完整", (c) => {
    const chart = buildZiWeiChart(c);
    expect(chart.palaces).toHaveLength(12);
    expect(chart.palaces[0]?.name).toBe("命宫");
    expect(chart.wuXingJu).toBe(c.expectIztro.wuXingJu);
  });

  it.each(ZIWEI_GOLDEN_CASES)("$label 对外适配", (c) => {
    const pub = buildZiWeiChartPublic(c);
    expect(pub.palaces).toHaveLength(12);
    expect(JSON.stringify(pub)).not.toContain("ragQuery");
  });
});

describe("紫微 · iztro 对照", () => {
  it.each(ZIWEI_GOLDEN_CASES)("$label 命宫身宫五行局", (c) => {
    const result = compareZiWeiWithIztro(c);
    assertZiWeiSoulBodyMatchesIztro(c, result);
  });

  it.each(ZIWEI_GOLDEN_CASES)("$label 十四主星", (c) => {
    const result = compareZiWeiWithIztro(c);
    assertZiWeiMajorStarsMatchIztro(c, result);
  });
});

describe("六爻", () => {
  it("比特识别乾坤", () => {
    expect(bitsToGua(0b111)).toBe("乾");
    expect(bitsToGua(0b000)).toBe("坤");
  });

  it("六亲关系", () => {
    expect(liuqinOf("木", "火")).toBe("子孙");
  });

  it("天水讼固定爻 · 影子提示", () => {
    const r = buildLiuYaoChart({
      mode: "manual",
      dayGan: "甲",
      values: [8, 7, 8, 7, 7, 7],
    });
    expect(r.lower).toBe("坎");
    expect(r.upper).toBe("乾");
    expect(r.shadowFight).toBe(true);
  });
});

describe("黄历", () => {
  it("日盘宜忌", () => {
    const r = buildHuangliDayPublic({ year: 2026, month: 8, day: 28, withPlain: true });
    expect(r.day.yi.length).toBeGreaterThan(0);
    expect(r.plain?.headline).toContain("2026-08-28");
  });

  it("择吉扫描", () => {
    const r = buildHuangliZejiPublic({
      matterId: "开业",
      fromYear: 2026,
      fromMonth: 8,
      fromDay: 1,
      dayCount: 30,
    });
    expect(r.matterId).toBe("开业");
    expect(Array.isArray(r.hits)).toBe(true);
  });
});

describe("风水", () => {
  it("坐向与八宅", () => {
    const r = buildFengShuiChart({
      year: 1990,
      month: 5,
      day: 1,
      gender: "male",
      headingDeg: 180,
    });
    expect(r.sittingFacing.facing).toBe("午");
    expect(r.cards.length).toBe(8);
    expect(JSON.stringify(r)).not.toContain("ragQuery");
  });
});
