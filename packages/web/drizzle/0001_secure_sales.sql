CREATE TABLE `app_identity_link` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_product_key` text NOT NULL,
	`destination_key` text NOT NULL,
	`customer_id` text NOT NULL,
	`product_id` text NOT NULL,
	`environment` text NOT NULL,
	`destination_user_id` text NOT NULL,
	`credential_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_identity_link_customer_product_key_unique` ON `app_identity_link` (`customer_product_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_identity_link_destination_key_unique` ON `app_identity_link` (`destination_key`);
--> statement-breakpoint
CREATE TABLE `integration_credential` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`environment` text NOT NULL,
	`status` text DEFAULT 'disabled' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `integration_nonce` (
	`key` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `app_link_code` (
	`id` text PRIMARY KEY NOT NULL,
	`code_hash` text NOT NULL,
	`customer_id` text NOT NULL,
	`product_id` text NOT NULL,
	`environment` text NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_link_code_code_hash_unique` ON `app_link_code` (`code_hash`);
--> statement-breakpoint
CREATE TABLE `payment_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`order_id` text NOT NULL,
	`subscription_id` text,
	`provider_payment_key` text NOT NULL,
	`environment` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text NOT NULL,
	`period_start` integer,
	`period_end` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `payment_event`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `customer_order`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscription`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_ledger_event_id_unique` ON `payment_ledger` (`event_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_ledger_provider_payment_key_unique` ON `payment_ledger` (`provider_payment_key`);
--> statement-breakpoint
CREATE TABLE `plan_version` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`snapshot` text NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `readiness_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`environment` text NOT NULL,
	`gate` text NOT NULL,
	`deployment_version` text NOT NULL,
	`reference` text NOT NULL,
	`verified_at` integer NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reconciliation_job` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`environment` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`evidence` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscription`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `terms_acceptance` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`order_id` text NOT NULL,
	`terms_version_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `customer_order`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`terms_version_id`) REFERENCES `terms_version`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `terms_acceptance_order_id_unique` ON `terms_acceptance` (`order_id`);
--> statement-breakpoint
CREATE TABLE `terms_version` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`product_id` text,
	`content` text NOT NULL,
	`content_hash` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`reviewed_by` text,
	`review_evidence` text,
	`published_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `customer_order` ADD COLUMN environment text NOT NULL DEFAULT 'disabled';
--> statement-breakpoint
ALTER TABLE `customer_order` ADD COLUMN idempotency_key text;
--> statement-breakpoint
ALTER TABLE `customer_order` ADD COLUMN snapshot text;
--> statement-breakpoint
ALTER TABLE `customer_order` ADD COLUMN terms_version_id text;
--> statement-breakpoint
ALTER TABLE `payment_event` ADD COLUMN environment text NOT NULL DEFAULT 'disabled';
--> statement-breakpoint
ALTER TABLE `subscription` ADD COLUMN environment text NOT NULL DEFAULT 'disabled';
--> statement-breakpoint
ALTER TABLE `subscription` ADD COLUMN snapshot text;
--> statement-breakpoint
ALTER TABLE `subscription` ADD COLUMN paid_through integer;
--> statement-breakpoint
ALTER TABLE `subscription` ADD COLUMN cancellation_state text NOT NULL DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE `entitlement` ADD COLUMN environment text NOT NULL DEFAULT 'disabled';
--> statement-breakpoint
ALTER TABLE `entitlement` ADD COLUMN source_key text;
--> statement-breakpoint
CREATE UNIQUE INDEX customer_order_idempotency_key_unique ON customer_order(idempotency_key);
--> statement-breakpoint
CREATE UNIQUE INDEX entitlement_source_key_unique ON entitlement(source_key);
