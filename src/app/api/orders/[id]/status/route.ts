import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { readSession } from "@/lib/session";
import { transitionOrderStatus } from "@/lib/orders";

const ALLOWED_ROLES = ["partner", "china_ops", "admin"] as const;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session || !(ALLOWED_ROLES as readonly string[]).includes(session.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const to =
    typeof body === "object" && body && "to" in body && typeof (body as { to: unknown }).to === "string"
      ? (body as { to: string }).to
      : "";
  const row = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = row[0];
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (session.role === "partner" && order.siteId !== session.siteId) {
    return NextResponse.json({ error: "Not authorized for this site." }, { status: 403 });
  }
  const result = await transitionOrderStatus(orderId, order.status, to);
  if (!result.ok) return NextResponse.json({ error: result.error ?? "Transition failed." }, { status: 400 });
  return NextResponse.json({ ok: true, nextStatus: result.nextStatus });
}
