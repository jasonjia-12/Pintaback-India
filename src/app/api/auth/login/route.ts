import { NextResponse } from "next/server";
import { compareSync } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSite } from "@/lib/sites";
import { setSessionCookie } from "@/lib/session";

const LoginSchema = z.object({
  site: z.enum(["in"]),
  email: z.string().email().max(190),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  const v = parsed.data;
  const site = await getSite(v.site);
  if (!site) return NextResponse.json({ error: "Unknown site." }, { status: 400 });
  const email = v.email.toLowerCase().trim();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !compareSync(v.password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (user.status !== "active") {
    return NextResponse.json({ error: "This account is disabled. Contact support." }, { status: 403 });
  }
  if (user.role === "buyer" && user.siteId !== site.id) {
    return NextResponse.json(
      { error: "This buyer account belongs to another site. Sign in there." },
      { status: 403 },
    );
  }
  await setSessionCookie({
    uid: user.id,
    role: user.role as "buyer" | "partner" | "china_ops" | "admin",
    siteId: user.siteId,
    email: user.email,
    name: user.displayName,
  });
  const redirectTo = user.role === "buyer" && user.siteId ? `/${user.siteId}/orders` : "/dashboard";
  return NextResponse.json({ ok: true, redirect: redirectTo });
}
