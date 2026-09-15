import { Site, formatMoney, siteNotifyEmails } from "./sites";

export type EmailDelivery = {
  mode: "recorded" | "sent" | "failed";
  recipientLabel: string;
  provider: string | null;
  resultText: string;
};

export type EmailOrderSummary = {
  orderNo: string;
  buyerCompany: string;
  buyerContact: string;
  buyerEmail: string;
  lines: { title: string; sku: string; qty: number; unit: string; lineLabel: string }[];
  totalMinor: number;
  currency: string;
  siteName: string;
  sellerDisplayName: string;
};

/**
 * Phase-1 email policy: order details are always recorded in-app and visible to the
 * Local Channel Partner and China Operations roles. Delivery to a real shared mailbox
 * is enabled by setting EMAIL_PROVIDER=resend + RESEND_API_KEY / RESEND_FROM.
 */
export async function deliverOrderEmail(site: Site, o: EmailOrderSummary): Promise<EmailDelivery> {
  const recipients = siteNotifyEmails(site);
  const recipientLabel = recipients.join(", ");
  const provider = (process.env.EMAIL_PROVIDER ?? "").toLowerCase();
  const apiKey = process.env.RESEND_API_KEY;

  if (provider !== "resend" || !apiKey) {
    return {
      mode: "recorded",
      recipientLabel,
      provider: null,
      resultText:
        "Outbound email not configured (EMAIL_PROVIDER empty). Notification recorded in-app; Local Partner and China Operations can view it in the dashboard.",
    };
  }

  const subject = `[New simulated order] ${o.orderNo} — ${o.buyerCompany}`;
  const lines = o.lines
    .map((l) => `- ${l.title} (${l.sku}) x${l.qty} ${l.unit} = ${l.lineLabel}`)
    .join("\n");
  const text = [
    `New simulated order received on ${o.siteName}.`,
    ``,
    `Order number: ${o.orderNo}`,
    `Buyer: ${o.buyerCompany} / ${o.buyerContact} <${o.buyerEmail}>`,
    `Total: ${formatMoney(o.totalMinor, o.currency)}`,
    ``,
    lines,
    ``,
    `Seller (Local Channel Partner): ${o.sellerDisplayName}`,
    `Follow-up: Local Channel Partner contacts the buyer and completes the offline local-to-local procurement contract.`,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "Pintaback Orders <orders@example.com>",
        to: recipients,
        subject,
        text,
      }),
    });
    if (!res.ok) {
      const err = (await res.text()).slice(0, 500);
      return { mode: "failed", recipientLabel, provider: "resend", resultText: `Send failed: HTTP ${res.status} ${err}` };
    }
    return { mode: "sent", recipientLabel, provider: "resend", resultText: "Delivered to shared mailbox recipients." };
  } catch (e) {
    return {
      mode: "failed",
      recipientLabel,
      provider: "resend",
      resultText: `Send error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
