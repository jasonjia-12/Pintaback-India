import { NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSite } from "@/lib/sites";
import { setSessionCookie } from "@/lib/session";

const RegisterSchema = z.object({
  site: z.enum(["in"]),
  email: z.string().email().max(190),
  password: z.string().min(8).max(200),
  companyName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(4).max(40),
  whatsapp: z.string().trim().max(40).optional().default(""),
  address: z.string().trim().max(300).optional().default(""),
  city: z.string().trim().min(1).max(120),
  taxId: z.string().trim().max(80).optional().default(""),
  buyerType: z.string().trim().max(60).optional().default("Retailer"),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const v = parsed.data;
  const site = await getSite(v.site);
  if (!site) return NextResponse.json({ error: "Unknown site." }, { status: 400 });

  const email = v.email.toLowerCase().trim();
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) {
    return NextResponse.json({ error: "This email is already registered — sign in instead." }, { status: 409 });
  }
  const now = Date.now();
  const row = await db
    .insert(users)
    .values({
      siteId: site.id,
      role: "buyer",
      email,
      passwordHash: hashSync(v.password, 10),
      displayName: v.companyName,
      companyName: v.companyName,
      contactName: v.contactName,
      phone: v.phone,
      whatsapp: v.whatsapp,
      address: v.address,
      city: v.city,
      taxId: v.taxId,
      buyerType: v.buyerType,
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  const id = Number(row.lastInsertRowid);
  await setSessionCookie({ uid: id, role: "buyer", siteId: site.id, email, name: v.companyName });
  return NextResponse.json({ ok: true, redirect: `/${site.id}/products` });
}
