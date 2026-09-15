CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_id` text NOT NULL,
	`order_id` integer,
	`kind` text DEFAULT 'order_new' NOT NULL,
	`audience` text DEFAULT 'both' NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`read_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notifications_site_idx` ON `notifications` (`site_id`);--> statement-breakpoint
CREATE TABLE `order_emails` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`site_id` text NOT NULL,
	`mode` text DEFAULT 'recorded' NOT NULL,
	`recipient_label` text DEFAULT '' NOT NULL,
	`provider` text,
	`result_text` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`product_id` integer,
	`sku` text NOT NULL,
	`title` text NOT NULL,
	`unit` text NOT NULL,
	`qty` integer NOT NULL,
	`unit_price_minor` integer NOT NULL,
	`line_minor` integer NOT NULL,
	`moq_at_order` integer DEFAULT 1 NOT NULL,
	`specs_json` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_no` text NOT NULL,
	`site_id` text NOT NULL,
	`buyer_id` integer NOT NULL,
	`type` text DEFAULT 'simulated' NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`currency` text NOT NULL,
	`subtotal_minor` integer DEFAULT 0 NOT NULL,
	`item_count` integer DEFAULT 0 NOT NULL,
	`buyer_snapshot_json` text DEFAULT '{}' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_no_unique` ON `orders` (`order_no`);--> statement-breakpoint
CREATE INDEX `orders_buyer_idx` ON `orders` (`buyer_id`);--> statement-breakpoint
CREATE INDEX `orders_site_status_idx` ON `orders` (`site_id`,`status`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_id` text NOT NULL,
	`sku` text NOT NULL,
	`title` text NOT NULL,
	`title_local` text,
	`category` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`unit` text DEFAULT 'pcs' NOT NULL,
	`moq` integer DEFAULT 1 NOT NULL,
	`price_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`cny_ref_price` real,
	`fx_rate` real,
	`specs_json` text DEFAULT '{}' NOT NULL,
	`images_json` text DEFAULT '[]' NOT NULL,
	`source` text NOT NULL,
	`source_offer_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_site_sku_uq` ON `products` (`site_id`,`sku`);--> statement-breakpoint
CREATE INDEX `products_site_status_idx` ON `products` (`site_id`,`status`);--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`brand_name` text NOT NULL,
	`tagline` text NOT NULL,
	`country_code` text NOT NULL,
	`country_name` text NOT NULL,
	`currency` text NOT NULL,
	`locale_primary` text DEFAULT 'en' NOT NULL,
	`locales` text DEFAULT '["en"]' NOT NULL,
	`order_prefix` text NOT NULL,
	`seller_display_name` text NOT NULL,
	`seller_address` text DEFAULT '' NOT NULL,
	`tax_label` text NOT NULL,
	`notify_emails` text DEFAULT '[]' NOT NULL,
	`support_contact` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`next_order_seq` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_id` text,
	`role` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`company_name` text DEFAULT '' NOT NULL,
	`contact_name` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`whatsapp` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`tax_id` text DEFAULT '' NOT NULL,
	`buyer_type` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);