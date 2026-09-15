import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSite } from "@/lib/sites";
import { readSession } from "@/lib/session";
import { createSimulatedOrder } from "@/lib/orders";

const OrderSchema = z.object({
  site: z.enum(["in"]),
  shippingMethod: z.enum(["sea", "air"]).default("sea"),
  items: z.array(z.object({ sku: z.string().min(1).max(80), qty: z.number().int().positive() })).min(1),
});

export async function POST(req: Request) {
  const session = await readSession();
  if (!session || session.role !== "buyer") {
    return NextResponse.json({ error: "Sign in with your buyer account first." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = OrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid order payload." }, { status: 400 });
  const v = parsed.data;
  if (session.siteId !== v.site) {
    return NextResponse.json({ error: "Account and site do not match." }, { status: 403 });
  }
  const site = await getSite(v.site);
  if (!site) return NextResponse.json({ error: "Unknown site." }, { status: 400 });
  const buyerRow = await db.select().from(users).where(eq(users.id, session.uid)).limit(1);
  const buyer = buyerRow[0];
  if (!buyer) return NextResponse.json({ error: "Buyer account not found." }, { status: 404 });
  try {
    const result = await createSimulatedOrder(
      site,
      {
        id: buyer.id,
        email: buyer.email,
        companyName: buyer.companyName || buyer.displayName,
        contactName: buyer.contactName || buyer.displayName,
        phone: buyer.phone,
        address: buyer.address,
        city: buyer.city,
        taxId: buyer.taxId,
      },
      v.items,
      v.shippingMethod,
    );
    return NextResponse.json({ ok: true, orderId: result.orderId, orderNo: result.orderNo });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Order could not be created." }, { status: 400 });
  }
}
