import {
  describe,
  expect,
  it
} from "vitest";

import {
  convertDistance,
  findEntity,
  getChildren,
  validConfidence,
  validVector,
  vectorLength,
  type SpaceEntity
} from "./index";

describe("Known Universe Core", () => {
  it("converts metres to kilometres", () => {
    expect(
      convertDistance(1000, "m", "km")
    ).toBe(1);
  });

  it("uses the correct astronomical unit", () => {
    expect(
      convertDistance(1, "au", "m")
    ).toBe(149_597_870_700);
  });

  it("calculates vector length", () => {
    expect(
      vectorLength([3, 4, 0])
    ).toBe(5);
  });

  it("validates confidence values", () => {
    expect(validConfidence(0)).toBe(true);
    expect(validConfidence(0.5)).toBe(true);
    expect(validConfidence(1)).toBe(true);

    expect(validConfidence(-0.1)).toBe(false);
    expect(validConfidence(1.1)).toBe(false);
  });

  it("rejects invalid vectors", () => {
    expect(
      validVector([1, 2, 3])
    ).toBe(true);

    expect(
      validVector([1, Number.NaN, 3])
    ).toBe(false);
  });

  it("supports entity hierarchies", () => {
    const entities: SpaceEntity[] = [
      {
        id: "sun",
        name: "Sun",
        kind: "star",
        sourceIds: []
      },
      {
        id: "earth",
        name: "Earth",
        kind: "planet",
        parentId: "sun",
        sourceIds: []
      },
      {
        id: "moon",
        name: "Moon",
        kind: "moon",
        parentId: "earth",
        sourceIds: []
      }
    ];

    expect(
      findEntity("earth", entities)?.name
    ).toBe("Earth");

    expect(
      getChildren("sun", entities)
    ).toHaveLength(1);

    expect(
      getChildren("earth", entities)[0]?.id
    ).toBe("moon");
  });
});