export const ACTIVE_MAX_DAYS = 14;
export const PASSIVE_MAX_DAYS = 30;
export const INACTIVE_MAX_DAYS = 90;

export type MemberActivityStatus =
  | "ACTIVE"
  | "PASSIVE"
  | "INACTIVE"
  | "DORMANT"
  | "NEVER";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export function classifyMemberActivity(
  lastActivityAt: string | null,
  now: Date,
): MemberActivityStatus {
  if (lastActivityAt === null) {
    return "NEVER";
  }

  const activityTimestamp = new Date(lastActivityAt).getTime();

  if (Number.isNaN(activityTimestamp)) {
    throw new Error("MEMBER_ACTIVITY_TIMESTAMP_INVALID");
  }

  const ageInDays = Math.max(0, (now.getTime() - activityTimestamp) / DAY_IN_MILLISECONDS);

  if (ageInDays <= ACTIVE_MAX_DAYS) {
    return "ACTIVE";
  }

  if (ageInDays <= PASSIVE_MAX_DAYS) {
    return "PASSIVE";
  }

  if (ageInDays <= INACTIVE_MAX_DAYS) {
    return "INACTIVE";
  }

  return "DORMANT";
}
