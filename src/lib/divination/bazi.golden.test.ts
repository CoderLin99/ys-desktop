/**
 * 八字黄金样例 · 服务端引擎（ming-web 专用，不依赖 iztro）。
 */
import { describe, expect, it } from "vitest";
import {
  BAZI_GOLDEN_CASES,
  BAZI_SHENSHA_GOLDEN_CASES,
} from "@/lib/divination/engine/golden/cases";
import {
  assertBaZiGoldenCase,
  assertBaZiMatchesEightCharDirect,
} from "@/lib/divination/engine/golden/compareBazi";
import { assertShenShaGoldenCase } from "@/lib/divination/engine/golden/compareShenSha";
import { buildBaziChart } from "@/lib/divination/adapters/bazi";

describe("黄金样例 · 八字四柱（服务端引擎）", () => {
  it.each(BAZI_GOLDEN_CASES)("$label 与期望四柱一致", (c) => {
    assertBaZiGoldenCase(c);
  });

  it.each(BAZI_GOLDEN_CASES.filter((c) => c.hour !== null))(
    "$label buildBaZi 与 EightChar 直取一致",
    (c) => {
      assertBaZiMatchesEightCharDirect(c);
    },
  );
});

describe("黄金样例 · 神煞（服务端引擎）", () => {
  it.each(BAZI_SHENSHA_GOLDEN_CASES)("$label 神煞回归", (c) => {
    assertShenShaGoldenCase(c);
  });
});

describe("API 适配层 · 脱敏响应", () => {
  it("buildBaziChart 不包含 rule/basis 字段", () => {
    const result = buildBaziChart({
      year: 1999,
      month: 6,
      day: 29,
      hour: 7,
      minute: 20,
      dayCutover: "ziZheng",
    });
    expect(result.pillars.year.ganZhi).toBe("己卯");
    expect(result.shenSha.length).toBeGreaterThan(0);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('"rule"');
    expect(serialized).not.toContain('"basis"');
  });
});
