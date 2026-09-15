import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const sites = sqliteTable("sites", {
  id: text("id").primaryKey(), // in
  name: text("name").notNull(),
  brandName: text("brand_name").notNull(),
  tagline: text("tagline").notNull(),
  countryCode: text("country_code").notNull(),
  countryName: text("country_name").notNull(),
  currency: text("currency").notNull(),
  localePrimary: text("locale_primary").notNull().default("en"),
  locales: text("locales").notNull().default('["en"]'),
  orderPrefix: text("order_prefix").notNull(),
  sellerDisplayName: text("seller_display_name").notNull(),
  sellerAddress: text("seller_address").notNull().default(""),
  taxLabel: text("tax_label").notNull(), // GSTIN
  notifyEmails: text("notify_emails").notNull().default("[]"),
  supportContact: text("support_contact").notNull().default(""),
  status: text("status").notNull().default("active"),
  nextOrderSeq: integer("next_order_seq").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  siteId: text("site_id"), // buyer -> own site; partner -> own site; china_ops/admin -> null
  role: text("role").notNull(), // buyer | partner | china_ops | admin
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  companyName: text("company_name").notNull().default(""),
  contactName: text("contact_name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  whatsapp: text("whatsapp").notNull().default(""),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  taxId: text("tax_id").notNull().default(""),
  buyerType: text("buyer_type").notNull().default(""),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    siteId: text("site_id").notNull(),
    sku: text("sku").notNull(),
    title: text("title").notNull(),
    titleLocal: text("title_local"),
    category: text("category").notNull(),
    description: text("description").notNull().default(""),
    unit: text("unit").notNull().default("pcs"),
    moq: integer("moq").notNull().default(1),
    priceMinor: integer("price_minor").notNull(), // minor units of site currency
    currency: text("currency").notNull(),
    cnyRefPrice: real("cny_ref_price"),
    fxRate: real("fx_rate"),
    specsJson: text("specs_json").notNull().default("{}"),
    imagesJson: text("images_json").notNull().default("[]"),
    source: text("source").notNull(), // seed | csv | 1688
    sourceOfferId: text("source_offer_id"),
    status: text("status").notNull().default("active"), // draft | active | archived
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("products_site_sku_uq").on(t.siteId, t.sku),
    index("products_site_status_idx").on(t.siteId, t.status),
  ],
);

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderNo: text("order_no").notNull().unique(),
    siteId: text("site_id").notNull(),
    buyerId: integer("buyer_id").notNull(),
    type: text("type").notNull().default("simulated"), // simulated | online (future)
    status: text("status").notNull().default("submitted"), // submitted | following_up | contracted | cancelled
    currency: text("currency").notNull(),
    subtotalMinor: integer("subtotal_minor").notNull().default(0),
    itemCount: integer("item_count").notNull().default(0),
    buyerSnapshotJson: text("buyer_snapshot_json").notNull().default("{}"),
    note: text("note").notNull().default(""),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("orders_buyer_idx").on(t.buyerId), index("orders_site_status_idx").on(t.siteId, t.status)],
);

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id"),
  sku: text("sku").notNull(),
  title: text("title").notNull(),
  unit: text("unit").notNull(),
  qty: integer("qty").notNull(),
  unitPriceMinor: integer("unit_price_minor").notNull(),
  lineMinor: integer("line_minor").notNull(),
  moqAtOrder: integer("moq_at_order").notNull().default(1),
  specsJson: text("specs_json"),
  createdAt: integer("created_at").notNull(),
});

export const notifications = sqliteTable(
  "notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    siteId: text("site_id").notNull(),
    orderId: integer("order_id"),
    kind: text("kind").notNull().default("order_new"), // order_new | status_change
    audience: text("audience").notNull().default("both"), // partner | china | both
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    readAt: integer("read_at"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("notifications_site_idx").on(t.siteId)],
);

export const orderEmails = sqliteTable("order_emails", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull(),
  siteId: text("site_id").notNull(),
  mode: text("mode").notNull().default("recorded"), // recorded | sent | failed
  recipientLabel: text("recipient_label").notNull().default(""),
  provider: text("provider"),
  resultText: text("result_text").notNull().default(""),
  createdAt: integer("created_at").notNull(),
});
