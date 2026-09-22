CREATE TABLE `diabetesImportBatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceFilename` varchar(255) NOT NULL,
	`fileSha256` varchar(64) NOT NULL,
	`sourceRecordCount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `diabetesImportBatches_id` PRIMARY KEY(`id`),
	CONSTRAINT `diabetesImportBatches_fileSha256_unique` UNIQUE(`fileSha256`)
);
--> statement-breakpoint
CREATE TABLE `diabetesPatientObservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`sourceColumn` varchar(128) NOT NULL,
	`dictionaryField` varchar(128) NOT NULL,
	`periodKey` int,
	`valueNumber` decimal(18,6),
	`valueText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `diabetesPatientObservations_id` PRIMARY KEY(`id`),
	CONSTRAINT `diabetesObservations_patient_column_unique` UNIQUE(`patientId`,`sourceColumn`)
);
--> statement-breakpoint
CREATE TABLE `diabetesPatients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importBatchId` int NOT NULL,
	`sourceRowNumber` int NOT NULL,
	`age` varchar(32) NOT NULL,
	`identifyBy` varchar(32) NOT NULL,
	`type1` int NOT NULL,
	`type2` int NOT NULL,
	`gdm` int NOT NULL,
	`sex` enum('FEMALE','MALE') NOT NULL,
	`dmOnset` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `diabetesPatients_id` PRIMARY KEY(`id`),
	CONSTRAINT `diabetesPatients_batch_row_unique` UNIQUE(`importBatchId`,`sourceRowNumber`)
);
--> statement-breakpoint
CREATE INDEX `diabetesObservations_patient_index` ON `diabetesPatientObservations` (`patientId`);--> statement-breakpoint
CREATE INDEX `diabetesObservations_dictionary_index` ON `diabetesPatientObservations` (`dictionaryField`,`periodKey`);--> statement-breakpoint
CREATE INDEX `diabetesPatients_batch_index` ON `diabetesPatients` (`importBatchId`);