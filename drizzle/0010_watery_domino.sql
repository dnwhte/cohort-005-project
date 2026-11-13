ALTER TABLE `refunds` ADD `amount` integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `refunds_one_pending_per_purchase` ON `refunds` (`purchase_id`) WHERE "refunds"."status" = 'requested';