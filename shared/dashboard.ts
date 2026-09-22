export type ReviewStatus = "Urgent" | "Review due" | "Healing";

export function getReviewPriority(status: ReviewStatus): "P1" | "P2" | "P3" {
  if (status === "Urgent") return "P1";
  if (status === "Review due") return "P2";
  return "P3";
}

export const careKpiDefinitions = {
  activeWounds: { label: "Active wounds", unit: "wounds", cadence: "daily" },
  needsReview: { label: "Need review", unit: "wounds", cadence: "real-time" },
  healingTrend: { label: "Healing trend", unit: "percent", cadence: "weekly" },
  followUpsDue: { label: "Follow-ups due", unit: "appointments", cadence: "daily" },
} as const;
