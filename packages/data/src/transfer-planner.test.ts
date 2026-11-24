import { describe, expect, it } from "vitest";
import {
  ASTRONOMICAL_UNIT_METERS as AU,
  estimateHohmannTransfer,
  timeUntilHohmannWindow,
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


  it("keeps a finite synodic period for nearby but distinct orbits", () => {
    const result = estimateHohmannTransfer(AU, AU * (1 + 1e-10));
    expect(result.synodicPeriodSeconds).not.toBeNull();
    expect(result.synodicPeriodSeconds).toBeGreaterThan(0);
    expect(Number.isFinite(result.synodicPeriodSeconds)).toBe(true);
  });

  it("rejects invalid orbital inputs", () => {
    for (const invalid of [0, -1, Infinity, NaN]) {
      expect(() => estimateHohmannTransfer(invalid, AU)).toThrow(RangeError);
    }
    expect(() => estimateHohmannTransfer(AU, AU, 0)).toThrow(RangeError);
  });
});


describe("next ideal transfer window", () => {
  it("returns zero when current phase is already aligned", () => {
    const target = 1.524 * AU;
    const phase = estimateHohmannTransfer(AU, target).departurePhaseRadians;
    expect(timeUntilHohmannWindow(AU, target, 0, phase)).toBeCloseTo(0, 8);
  });

  it("returns half a synodic period for opposite phase", () => {
    const target = 1.524 * AU;
    const estimate = estimateHohmannTransfer(AU, target);
    const wait = timeUntilHohmannWindow(AU, target, 0, estimate.departurePhaseRadians + Math.PI);
    expect(wait).toBeCloseTo(estimate.synodicPeriodSeconds! / 2, 5);
  });

  it("handles inward transfers, full rotations, and coincident orbits", () => {
    const phase = estimateHohmannTransfer(1.524 * AU, AU).departurePhaseRadians;
    expect(timeUntilHohmannWindow(1.524 * AU, AU, 4 * Math.PI, phase - 2 * Math.PI)).toBeCloseTo(0, 7);
    expect(timeUntilHohmannWindow(AU, AU, 0, 0)).toBeNull();
  });

  it("rejects non-finite longitudes", () => {
    expect(() => timeUntilHohmannWindow(AU, 1.524 * AU, NaN, 0)).toThrow(RangeError);
  });
});
