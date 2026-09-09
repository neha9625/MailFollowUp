-- ============================================================================
-- Gmail Email Follow-up Automation System — MySQL Schema
-- Safe to re-run (idempotent). Auto-applied on server boot when DB_AUTO_SYNC=true
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `gmail_followup_automation`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `gmail_followup_automation`;

-- ----------------------------------------------------------------------------
-- uploaded_files : one active Excel file at a time
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `uploaded_file` (
  `id`              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `file_name`       VARCHAR(255)    NOT NULL,
  `total_records`   INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT 'valid + invalid rows',
  `valid_records`   INT UNSIGNED    NOT NULL DEFAULT 0,
  `invalid_records` INT UNSIGNED    NOT NULL DEFAULT 0,
  `is_active`       TINYINT(1)      NOT NULL DEFAULT 1,
  `uploaded_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_uploaded_files_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- email_records : parsed rows of the active/historical files
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `email_records` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `file_id`    INT UNSIGNED NOT NULL,
  `email`      VARCHAR(255) NOT NULL,
  `name`       VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email_records_file_email` (`file_id`, `email`),
  KEY `idx_email_records_email`  (`email`),
  KEY `idx_email_records_file_id` (`file_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- email_templates : FOLLOW_UP + NEW_EMAIL  ×  Monday..Friday
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `email_templates` (
  `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `template_type` ENUM ('FOLLOW_UP', 'NEW_EMAIL') NOT NULL,
  `day_of_week`  ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday') NOT NULL,
  `subject`      VARCHAR(500)  NOT NULL,
  `body`         MEDIUMTEXT    NOT NULL,
  `is_active`    TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_template_type_day` (`template_type`, `day_of_week`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- gmail_connections : single row (id = 1) holding the OAuth tokens.
-- Tokens are encrypted at rest (AES-256-GCM keyed from SESSION_SECRET).
-- Never stores a Gmail password.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `gmail_connections` (
  `id`                INT UNSIGNED NOT NULL,
  `google_email`      VARCHAR(255)          DEFAULT NULL,
  `access_token_enc`  TEXT                  DEFAULT NULL,
  `refresh_token_enc` TEXT                  DEFAULT NULL,
  `token_expiry`      DATETIME              DEFAULT NULL,
  `scope`             VARCHAR(500)          DEFAULT NULL,
  `is_connected`      TINYINT(1)   NOT NULL DEFAULT 0,
  `last_error`        VARCHAR(500)          DEFAULT NULL,
  `connected_at`      TIMESTAMP    NULL     DEFAULT NULL,
  `updated_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- email_logged : permanent history. NEVER deleted when a new Excel is uploaded.
-- Duplicate-send protection: unique (email_record_id, process_date) — a record
-- can only have ONE successful send per day. FAILED/SKIPPED rows use
-- process_date = NULL (MySQL allows unlimited NULL duplicates) so they can be
-- retried safely.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `email_logged` (
  `id`               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `email_record_id`  INT UNSIGNED  NULL DEFAULT NULL,
  `email`            VARCHAR(255)  NOT NULL,
  `name`             VARCHAR(255)  NULL DEFAULT NULL,
  `mail_found`       TINYINT(1)    NULL DEFAULT NULL COMMENT '1 = previous mail found, 0 = none',
  `email_type`       ENUM ('FOLLOW_UP', 'NEW_EMAIL') NOT NULL,
  `template_type`    VARCHAR(20)   NOT NULL COMMENT 'weekday used (e.g. Monday)',
  `subject`          VARCHAR(500)  NULL DEFAULT NULL,
  `gmail_message_id` VARCHAR(128)  NULL DEFAULT NULL,
  `gmail_thread_id`  VARCHAR(128)  NULL DEFAULT NULL,
  `status`           ENUM ('SUCCESS', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'FAILED',
  `error_message`    TEXT          NULL DEFAULT NULL,
  `sent_at`          DATETIME      NULL DEFAULT NULL,
  `process_date`     DATE          NULL DEFAULT NULL,
  `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email_logs_record_process_date` (`email_record_id`, `process_date`),
  KEY `idx_email_logs_email`  (`email`),
  KEY `idx_email_logs_status` (`status`),
  KEY `idx_email_logs_sent_at` (`sent_at`),
  KEY `idx_email_logs_process_date` (`process_date`),
  CONSTRAINT `fk_email_logs_record`
    FOREIGN KEY (`email_record_id`) REFERENCES `email_records` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
