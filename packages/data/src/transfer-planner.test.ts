import { describe, expect, it } from "vitest";
import {
  ASTRONOMICAL_UNIT_METERS as AU,
  estimateHohmannTransfer,
} from "./transfer-planner";

describe("ideal Hohmann transfer estimator", () => {
  it("requires zero delta-v for identical circular orbits", () => {
    const result = estimateHohmannTransfer(AU, AU);
    expect(result.totalDeltaV).toBeCloseTo(0, 7);
    expect(result.synodicPeriodSeconds).toBeNull();
    expect(result.departurePhaseRadians).toBeCloseTo(0, 10);
  });

  it("estimates an Earth-to-Mars-like transfer at roughly 259 days", () => {
    const result = estimateHohmannTransfer(AU, 1.524 * AU);
    expect(result.flightSeconds / 86400).toBeGreaterThan(250);
    expect(result.flightSeconds / 86400).toBeLessThan(270);
    expect(result.totalDeltaV).toBeGreaterThan(5000);
    expect(result.totalDeltaV).toBeLessThan(6000);
    expect(result.departurePhaseRadians).toBeGreaterThan(0);
    expect(result.departurePhaseRadians).toBeLessThan(Math.PI);
  });

  it("produces symmetric flight times and ideal delta-v totals", () => {
    const outward = estimateHohmannTransfer(AU, 1.524 * AU);
    const inward = estimateHohmannTransfer(1.524 * AU, AU);
    expect(inward.flightSeconds).toBe(outward.flightSeconds);
    expect(inward.totalDeltaV).toBeCloseTo(outward.totalDeltaV, 8);
  });

  it("rejects invalid orbital inputs", () => {
    for (const invalid of [0, -1, Infinity, NaN]) {
      expect(() => estimateHohmannTransfer(invalid, AU)).toThrow(RangeError);
    }
    expect(() => estimateHohmannTransfer(AU, AU, 0)).toThrow(RangeError);
  });
});
