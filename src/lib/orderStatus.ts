export type OrderStatus = "submitted" | "following_up" | "contracted" | "cancelled";

export const ORDER_STATUSES: OrderStatus[] = ["submitted", "following_up", "contracted", "cancelled"];

const STATUS_LABEL: Record<OrderStatus, string> = {
  submitted: "Submitted — awaiting channel follow-up",
  following_up: "Channel partner is following up",
  contracted: "Offline local contract signed",
  cancelled: "Cancelled",
};

export function orderStatusLabel(s: string): string {
  return STATUS_LABEL[s as OrderStatus] ?? s;
}

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  submitted: ["following_up", "cancelled"],
  following_up: ["contracted", "cancelled"],
  contracted: [],
  cancelled: [],
};

export function canTransition(from: string, to: string): boolean {
  return (TRANSITIONS[from as OrderStatus] ?? []).includes(to as OrderStatus);
}

export function nextTargets(status: string): OrderStatus[] {
  return TRANSITIONS[status as OrderStatus] ?? [];
}
