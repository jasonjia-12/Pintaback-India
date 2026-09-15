"use client";

import Link from "next/link";
import { useState } from "react";
import type { Site } from "@/lib/sites";

function Field({
  label,
  children,
  optional,
}: {
  label: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="label-sm mb-1.5 block text-ink/50">
        {label} {optional && <em className="font-normal not-italic text-ink/35">(optional)</em>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine-600 focus:ring-2 focus:ring-pine-600/15";

const errorCls = "rounded-md border border-error/30 bg-error-soft/50 px-3 py-2 text-sm text-error";
const submitCls =
  "w-full rounded-md bg-pine-600 py-3 text-sm font-semibold text-white transition hover:bg-pine-700 disabled:opacity-60";

export function LoginForm({ site, next }: { site: Site; next: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site: site.id, email: fd.get("email"), password: fd.get("password") }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Sign-in failed.");
      setBusy(false);
      return;
    }
    window.location.assign(data.redirect ?? next);
  }
  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      {error && <p className={errorCls}>{error}</p>}
      <Field label="Business email">
        <input name="email" type="email" required autoComplete="email" className={inputCls} placeholder="you@company.com" />
      </Field>
      <Field label="Password">
        <input name="password" type="password" required autoComplete="current-password" className={inputCls} />
      </Field>
      <button
        disabled={busy}
        className={submitCls}
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-ink/55">
        New to {site.name}?{" "}
        <Link className="font-semibold text-pine-900 underline-offset-4 hover:underline" href={`/${site.id}/register`}>
          Register your business
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ site, next }: { site: Site; next: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = { site: site.id };
    for (const k of [
      "email", "password", "companyName", "contactName", "phone", "whatsapp",
      "address", "city", "taxId", "buyerType",
    ]) body[k] = fd.get(k) ?? "";
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Registration failed.");
      setBusy(false);
      return;
    }
    window.location.assign(data.redirect ?? next);
  }
  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      {error && <p className={errorCls}>{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name">
          <input name="companyName" required className={inputCls} placeholder="Your registered business" />
        </Field>
        <Field label="Contact person">
          <input name="contactName" required className={inputCls} placeholder="Full name" />
        </Field>
        <Field label="Business email">
          <input name="email" type="email" required className={inputCls} placeholder="you@company.com" />
        </Field>
        <Field label="Password">
          <input name="password" type="password" required minLength={8} className={inputCls} placeholder="Min 8 characters" />
        </Field>
        <Field label="Phone">
          <input
            name="phone"
            required
            className={inputCls}
            placeholder="+91 9xxxx xxxxx"
          />
        </Field>
        <Field label="WhatsApp" optional>
          <input name="whatsapp" className={inputCls} placeholder="Usually the same as phone" />
        </Field>
        <Field label={`${site.taxLabel} number`} optional>
          <input name="taxId" className={inputCls} placeholder={`${site.taxLabel} (optional in phase 1)`} />
        </Field>
        <Field label="Business type">
          <select name="buyerType" className={inputCls} defaultValue="Retailer">
            {["Retailer", "Wholesaler", "Distributor", "Online seller", "Other"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="City">
          <input
            name="city"
            required
            className={inputCls}
            placeholder="Mumbai / Delhi / …"
          />
        </Field>
        <Field label="Street address" optional>
          <input name="address" className={inputCls} placeholder="Shop / warehouse address" />
        </Field>
      </div>
      <button
        disabled={busy}
        className={submitCls}
      >
        {busy ? "Creating account…" : "Register business account"}
      </button>
      <p className="text-center text-xs leading-relaxed text-ink/50">
        Your profile and order history are stored on the Pintaback platform so the team can follow up and
        serve future re-orders. No online payment is collected in phase 1.
      </p>
    </form>
  );
}
