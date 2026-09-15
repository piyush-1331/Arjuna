CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`patientId` int,
	`referralId` int,
	`kind` enum('high_risk','referral','overdue_follow_up','low_stock','system') NOT NULL,
	`title` varchar(180) NOT NULL,
	`message` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int,
	`action` varchar(120) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` int,
	`detail` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `facilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`facilityType` enum('aam','sub_centre','phc','chc','district_hospital','specialist') NOT NULL,
	`district` varchar(120) NOT NULL,
	`village` varchar(120),
	`address` text,
	`phone` varchar(40),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`capabilities` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `facilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `followUps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`assignedTo` int NOT NULL,
	`referralId` int,
	`title` varchar(180) NOT NULL,
	`dueAt` timestamp NOT NULL,
	`status` enum('open','completed','overdue') NOT NULL DEFAULT 'open',
	`notes` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `followUps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `healthVisits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`recordedBy` int NOT NULL,
	`facilityId` int,
	`symptoms` text,
	`notes` text,
	`diagnosis` text,
	`bpSystolic` int,
	`bpDiastolic` int,
	`spo2` int,
	`temperature` decimal(4,1),
	`glucose` int,
	`weight` decimal(5,1),
	`triageLevel` enum('emergency','urgent','routine','self_care'),
	`aiSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `healthVisits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` int AUTO_INCREMENT NOT NULL,
	`headName` varchar(180) NOT NULL,
	`village` varchar(120) NOT NULL,
	`district` varchar(120) NOT NULL,
	`contact` varchar(40),
	`assignedWorkerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `households_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medicines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facilityId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`category` varchar(100),
	`currentStock` int NOT NULL DEFAULT 0,
	`reorderLevel` int NOT NULL DEFAULT 10,
	`unit` varchar(40) NOT NULL DEFAULT 'packs',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medicines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`householdId` int,
	`name` varchar(180) NOT NULL,
	`age` int NOT NULL,
	`gender` enum('female','male','other','undisclosed') NOT NULL DEFAULT 'undisclosed',
	`contact` varchar(40),
	`village` varchar(120),
	`district` varchar(120) NOT NULL,
	`emergencyContact` varchar(120),
	`bloodGroup` varchar(8),
	`allergies` text,
	`conditions` text,
	`riskScore` int NOT NULL DEFAULT 0,
	`riskCategory` enum('low','moderate','high','critical') NOT NULL DEFAULT 'low',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`createdBy` int NOT NULL,
	`targetFacilityId` int,
	`specialty` varchar(120),
	`urgency` enum('emergency','urgent','routine') NOT NULL,
	`reason` text NOT NULL,
	`status` enum('pending','accepted','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`outcome` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('citizen','asha_cho','doctor','facility_staff','administrator') NOT NULL DEFAULT 'citizen';--> statement-breakpoint
ALTER TABLE `users` ADD `facilityId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `district` varchar(120);