import type { RequestStatus } from "@/generated/prisma/enums";

/**
 * Status changes a maintenance technician (or admin) may make.
 * Closed statuses (COMPLETED / REJECTED / CANCELLED) are terminal.
 */
export const STAFF_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  PENDING: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["IN_PROGRESS", "ON_HOLD", "COMPLETED", "REJECTED"],
  IN_PROGRESS: ["ON_HOLD", "COMPLETED", "REJECTED"],
  ON_HOLD: ["IN_PROGRESS", "COMPLETED", "REJECTED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

/** The reporter can withdraw a request until work has started. */
export const CANCELLABLE_STATUSES: RequestStatus[] = ["PENDING", "ACCEPTED"];

/** Main path shown in the progress stepper. */
export const PROGRESS_STEPS: RequestStatus[] = ["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"];

export function canStaffTransition(from: RequestStatus, to: RequestStatus) {
  return STAFF_TRANSITIONS[from].includes(to);
}
