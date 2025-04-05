CREATE TABLE `oauth_accounts` (
	`provider_id` enum('github','google') NOT NULL,
	`provider_user_id` varchar(255) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`scopes` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `oauth_accounts_provider_id_provider_user_id_pk` PRIMARY KEY(`provider_id`,`provider_user_id`),
	CONSTRAINT `oauth_user_provider_uk` UNIQUE(`user_id`,`provider_id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `hashed_password` text;--> statement-breakpoint
ALTER TABLE `oauth_accounts` ADD CONSTRAINT `oauth_accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `oauth_user_id_idx` ON `oauth_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `username_idx` ON `users` (`username`);