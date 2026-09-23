import type { Priority, RequestStatus, Role } from "@/generated/prisma/enums";
import {
  PRIORITY_LABEL,
  PRIORITY_STYLE,
  ROLE_LABEL,
  ROLE_STYLE,
  STATUS_LABEL,
  STATUS_STYLE,
} from "@/lib/labels";

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`badge ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`badge ${PRIORITY_STYLE[priority]}`}>ความเร่งด่วน: {PRIORITY_LABEL[priority]}</span>;
}

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`badge ${ROLE_STYLE[role]}`}>{ROLE_LABEL[role]}</span>;
}
