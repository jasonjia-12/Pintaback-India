import { orderStatusLabel } from "@/lib/orderStatus";

export default function StatusPill({ status }: { status: string }) {
  const color =
    status === "contracted"
      ? "bg-emerald-100 text-emerald-800"
      : status === "following_up"
        ? "bg-ochre-soft text-ochre"
        : status === "cancelled"
          ? "bg-neutral-200 text-neutral-600"
          : "bg-verified text-pine-900";
  return <span className={`label-sm rounded-sm px-2 py-1 ${color}`}>{orderStatusLabel(status)}</span>;
}
