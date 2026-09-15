import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { Role } from "./roles";

export type SessionUser = {
  uid: number;
  role: Role;
  siteId: string | null;
  email: string;
  name: string;
};

const COOKIE_NAME = "ptb_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const DEV_FALLBACK_SECRET = "pintaback-phase1-dev-session-secret-change-me";

function secretBytes(): Uint8Array {
  const secret = process.env.SESSION_SECRET ?? DEV_FALLBACK_SECRET;
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in production");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    role: user.role,
    siteId: user.siteId,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.uid))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretBytes());
}

async function cookieStore() {
  return cookies();
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await signSessionToken(user);
  const store = await cookieStore();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookieStore();
  store.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function readSession(): Promise<SessionUser | null> {
  const store = await cookieStore();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretBytes());
    if (!payload.sub || typeof payload.role !== "string") return null;
    const role = payload.role as Role;
    return {
      uid: Number(payload.sub),
      role,
      siteId: typeof payload.siteId === "string" ? payload.siteId : null,
      email: typeof payload.email === "string" ? payload.email : "",
      name: typeof payload.name === "string" ? payload.name : "",
    };
  } catch {
    return null;
  }
}
