"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { canTransition, nextTargets } from "@/lib/orderStatus";

export default function OrderActions({ orderId, status }: { orderId: number; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const targets =
    status === "submitted"
      ? (["following_up", "cancelled"] as const)
      : status === "following_up"
        ? (["contracted", "cancelled"] as const)
        : ([] as const);
  const labels: Record<string, string> = {
    following_up: "Mark as being followed up",
    contracted: "Contract signed (offline)",
    cancelled: "Cancel order",
  };
  async function act(to: string) {
    if (!canTransition(status, to)) return;
    setBusy(to);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
      setBusy("");
    }
  }
  if (targets.length === 0) return null;
  return (
    <div>
      {error && <p className="mb-3 rounded-md border border-error/30 bg-error-soft/50 px-3 py-2 text-sm text-error">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {targets.map((t) => (
          <button
            key={t}
            type="button"
            disabled={busy !== ""}
            onClick={() => act(t)}
            className={
              t === "cancelled"
                ? "rounded-md border border-error/30 bg-error-soft/50 px-4 py-2 text-sm font-semibold text-error transition hover:bg-error-soft disabled:opacity-50"
                : "rounded-md bg-pine-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine-700 disabled:opacity-50"
            }
          >
            {busy === t ? "Updating…" : labels[t]}
          </button>
        ))}
      </div>
    </div>
  );
}
