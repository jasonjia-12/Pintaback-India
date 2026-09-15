"use client";

export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.assign("/in");
      }}
      className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-error/40 hover:text-error"
    >
      Sign out
    </button>
  );
}
