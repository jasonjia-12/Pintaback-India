import { CatalogProvider } from "./types";

/**
 * Official 1688 connector (planned, NOT part of phase-1 acceptance).
 *
 * Integration contract for the future implementer:
 * 1. Authorization: 1688 Open Platform (open.1688.com) app key/secret + buyer auth token;
 *    supplier APIs are only exposed for offers the supplier authorized (cross-border / 分销权限).
 * 2. Endpoints (server-side, never in browser): 商品详情/搜索/跨境供货 etc. Pull by category + keyword.
 * 3. Mapping into RawOffer: titleEn/titleLocal via translation layer, watermarked media re-host,
 *    price converted CNY -> site currency with fx snapshot + buffer; moq from offer.
 * 4. Sync policy: idempotent upsert keyed by (site_id, source_offer_id); scheduler later.
 *
 * Env required when enabled: ALIBABA_1688_APP_KEY, ALIBABA_1688_APP_SECRET, ALIBABA_1688_TOKEN.
 */
export const ALIBABA1688_PROVIDER: CatalogProvider = {
  id: "alibaba1688",
  label: "1688 Open Platform connector (not implemented in phase 1)",
  async pull() {
    throw new Error(
      "1688 connector is not implemented in phase 1. Granting is pending (appKey/appSecret/API authorization). See src/catalog/alibaba1688-provider.ts for the integration contract.",
    );
  },
};
