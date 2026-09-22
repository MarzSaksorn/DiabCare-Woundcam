import { describe, expect, it } from "vitest";
import { careKpiDefinitions, getReviewPriority } from "../shared/dashboard";

describe("clinical dashboard metric governance", () => {
  it("maps review statuses to stable triage priorities", () => {
    expect(getReviewPriority("Urgent")).toBe("P1");
    expect(getReviewPriority("Review due")).toBe("P2");
    expect(getReviewPriority("Healing")).toBe("P3");
  });

  it("defines the cadence and unit for each headline KPI", () => {
    expect(careKpiDefinitions.needsReview).toEqual({
      label: "Need review",
      unit: "wounds",
      cadence: "real-time",
    });
    expect(careKpiDefinitions.healingTrend.unit).toBe("percent");
  });
});
