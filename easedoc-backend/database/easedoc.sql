-- EaseDoc clean database bootstrap
-- Use this file for a fresh install on another machine.
-- Default admin login:
--   email: admin@easedoc.local
--   password: admin123

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

DROP DATABASE IF EXISTS `easedoc`;
CREATE DATABASE `easedoc`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;
USE `easedoc`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `document_section_blocks`;
DROP TABLE IF EXISTS `document_sections`;
DROP TABLE IF EXISTS `documents`;
DROP TABLE IF EXISTS `template_section_versions`;
DROP TABLE IF EXISTS `template_versions`;
DROP TABLE IF EXISTS `templates`;
DROP TABLE IF EXISTS `standards`;
DROP TABLE IF EXISTS `document_types`;
DROP TABLE IF EXISTS `pending_user_verifications`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fullName` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `accountStatus` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `pending_user_verifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fullName` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `verification_code` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `resend_available_at` datetime NOT NULL,
  `attempts` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pending_user_verifications_email` (`email`),
  KEY `idx_pending_user_verifications_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `document_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_document_types_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `standards` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `document_type_id` int(11) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_standards_document_type_id` (`document_type_id`),
  CONSTRAINT `fk_standards_document_type`
    FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `document_type_id` int(11) NOT NULL,
  `standard_id` int(11) NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `base_template_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_templates_document_type_id` (`document_type_id`),
  KEY `idx_templates_standard_id` (`standard_id`),
  KEY `idx_templates_created_by` (`created_by`),
  KEY `idx_templates_base_template_id` (`base_template_id`),
  CONSTRAINT `fk_templates_document_type`
    FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT `fk_templates_standard`
    FOREIGN KEY (`standard_id`) REFERENCES `standards` (`id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT `fk_templates_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT `fk_templates_base_template`
    FOREIGN KEY (`base_template_id`) REFERENCES `templates` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `template_versions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `template_id` int(11) NOT NULL,
  `version_number` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `default_font_family` varchar(100) NOT NULL DEFAULT 'Times New Roman',
  `default_line_height` float NOT NULL DEFAULT 1.5,
  `page_margin_top` float NOT NULL DEFAULT 20,
  `page_margin_bottom` float NOT NULL DEFAULT 20,
  `page_margin_left` float NOT NULL DEFAULT 20,
  `page_margin_right` float NOT NULL DEFAULT 20,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_template_versions_template_version` (`template_id`, `version_number`),
  KEY `idx_template_versions_template_active` (`template_id`, `is_active`),
  CONSTRAINT `fk_template_versions_template`
    FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `template_section_versions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `template_version_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `level` int(11) NOT NULL DEFAULT 1,
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `title_font_size` int(11) NOT NULL DEFAULT 16,
  `title_font_weight` varchar(20) NOT NULL DEFAULT 'bold',
  `title_text_align` varchar(20) NOT NULL DEFAULT 'left',
  `body_font_size` int(11) NOT NULL DEFAULT 12,
  `body_font_weight` varchar(20) NOT NULL DEFAULT 'normal',
  `body_text_align` varchar(20) NOT NULL DEFAULT 'left',
  `line_height` float NOT NULL DEFAULT 1.5,
  `list_type` varchar(20) NOT NULL DEFAULT 'none',
  `margin_top` float NOT NULL DEFAULT 10,
  `margin_bottom` float NOT NULL DEFAULT 10,
  `padding_left` float NOT NULL DEFAULT 0,
  `section_order` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_template_section_versions_order` (`template_version_id`, `section_order`),
  KEY `idx_template_section_versions_template_version_id` (`template_version_id`),
  CONSTRAINT `fk_template_section_versions_template_version`
    FOREIGN KEY (`template_version_id`) REFERENCES `template_versions` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `template_id` int(11) NOT NULL,
  `template_version_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL DEFAULT 'Untitled Document',
  `status` enum('draft','completed') NOT NULL DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_documents_user_id` (`user_id`),
  KEY `idx_documents_template_id` (`template_id`),
  KEY `idx_documents_template_version_id` (`template_version_id`),
  CONSTRAINT `fk_documents_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_documents_template`
    FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT `fk_documents_template_version`
    FOREIGN KEY (`template_version_id`) REFERENCES `template_versions` (`id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `document_sections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `document_id` int(11) NOT NULL,
  `template_section_version_id` int(11) NOT NULL,
  `content` text DEFAULT NULL,
  `custom_title` text DEFAULT NULL,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_document_sections_document_section` (`document_id`, `template_section_version_id`),
  KEY `idx_document_sections_template_section_version_id` (`template_section_version_id`),
  CONSTRAINT `fk_document_sections_document`
    FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_document_sections_template_section_version`
    FOREIGN KEY (`template_section_version_id`) REFERENCES `template_section_versions` (`id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `document_section_blocks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `document_section_id` int(11) NOT NULL,
  `block_type` enum('paragraph','image','table') NOT NULL DEFAULT 'paragraph',
  `block_order` int(11) NOT NULL,
  `text_content` text DEFAULT NULL,
  `image_src` longtext DEFAULT NULL,
  `image_alt` varchar(255) DEFAULT NULL,
  `image_caption` text DEFAULT NULL,
  `table_data` longtext DEFAULT NULL,
  `metadata` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_document_section_blocks_order` (`document_section_id`, `block_order`),
  KEY `idx_document_section_blocks_section_type` (`document_section_id`, `block_type`),
  CONSTRAINT `fk_document_section_blocks_section`
    FOREIGN KEY (`document_section_id`) REFERENCES `document_sections` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `users`
  (`id`, `fullName`, `email`, `password`, `role`, `accountStatus`)
VALUES
  (1, 'EaseDoc Admin', 'admin@easedoc.local', '$2b$10$FIbp0G1ORn5u0mE1c2xSXOXNg4h2S14o/DmBpmC8KlwXtk9/3lx9y', 'admin', 1);

INSERT INTO `document_types` (`id`, `name`) VALUES
  (1, 'SRS'),
  (2, 'SDS'),
  (3, 'SDD');

INSERT INTO `standards`
  (`id`, `name`, `description`, `document_type_id`, `active`)
VALUES
  (1, 'IEEE 830-1998', 'Recommended practice for Software Requirements Specifications.', 1, 1),
  (2, 'ISO/IEC/IEEE 29148:2018', 'Requirements engineering processes and information items for systems and software.', 1, 1),
  (3, 'ISO/IEC/IEEE 12207:2026', 'Software life cycle processes, including design-related process context.', 2, 1),
  (4, 'ISO/IEC/IEEE 15288:2023', 'System life cycle processes useful for system design specification context.', 2, 1),
  (5, 'IEEE 1016-2009', 'Standard for Software Design Descriptions.', 3, 1),
  (6, 'ISO/IEC/IEEE 42010:2022', 'Architecture description standard for software, systems, and enterprises.', 3, 1);

INSERT INTO `templates`
  (`id`, `name`, `description`, `document_type_id`, `standard_id`, `created_by`, `active`, `base_template_id`)
VALUES
  (1, 'Software Requirements Specification', 'SRS template aligned with IEEE 830-1998.', 1, 1, 1, 1, NULL),
  (2, 'Requirements Engineering Specification', 'SRS template aligned with ISO/IEC/IEEE 29148:2018.', 1, 2, 1, 1, NULL),
  (3, 'System Design Specification', 'SDS template for system-level design planning.', 2, 3, 1, 1, NULL),
  (4, 'Software Design Description', 'SDD template aligned with IEEE 1016-2009.', 3, 5, 1, 1, NULL),
  (5, 'Architecture Description', 'Architecture description template aligned with ISO/IEC/IEEE 42010:2022.', 3, 6, 1, 1, NULL);

INSERT INTO `template_versions`
  (`id`, `template_id`, `version_number`, `is_active`, `default_font_family`, `default_line_height`, `page_margin_top`, `page_margin_bottom`, `page_margin_left`, `page_margin_right`)
VALUES
  (1, 1, 1, 1, 'Times New Roman', 1.5, 20, 20, 20, 20),
  (2, 2, 1, 1, 'Times New Roman', 1.5, 20, 20, 20, 20),
  (3, 3, 1, 1, 'Times New Roman', 1.5, 20, 20, 20, 20),
  (4, 4, 1, 1, 'Times New Roman', 1.5, 20, 20, 20, 20),
  (5, 5, 1, 1, 'Times New Roman', 1.5, 20, 20, 20, 20);

INSERT INTO `template_section_versions`
  (`id`, `template_version_id`, `title`, `level`, `is_required`, `title_font_size`, `title_font_weight`, `title_text_align`, `body_font_size`, `body_font_weight`, `body_text_align`, `line_height`, `list_type`, `margin_top`, `margin_bottom`, `padding_left`, `section_order`)
VALUES
  (1, 1, 'Introduction', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'none', 10, 10, 0, 1),
  (2, 1, 'Overall Description', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'none', 10, 10, 0, 2),
  (3, 1, 'Specific Requirements', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'numbered', 10, 10, 0, 3),
  (4, 1, 'External Interface Requirements', 1, 0, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'none', 10, 10, 0, 4),
  (5, 1, 'Non-functional Requirements', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'numbered', 10, 10, 0, 5),

  (6, 2, 'Purpose and Scope', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'none', 10, 10, 0, 1),
  (7, 2, 'Stakeholders and System Context', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'none', 10, 10, 0, 2),
  (8, 2, 'System Requirements', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'numbered', 10, 10, 0, 3),
  (9, 2, 'Verification and Validation Criteria', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'numbered', 10, 10, 0, 4),

  (10, 3, 'Introduction', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'none', 10, 10, 0, 1),
  (11, 3, 'System Architecture', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'none', 10, 10, 0, 2),
  (12, 3, 'Data Design', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'none', 10, 10, 0, 3),
  (13, 3, 'Interface Design', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'none', 10, 10, 0, 4),
  (14, 3, 'Deployment Design', 1, 0, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'none', 10, 10, 0, 5),

  (15, 4, 'Introduction', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'none', 10, 10, 0, 1),
  (16, 4, 'Design Overview', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'none', 10, 10, 0, 2),
  (17, 4, 'Architectural Design', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'none', 10, 10, 0, 3),
  (18, 4, 'Component Design', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'numbered', 10, 10, 0, 4),
  (19, 4, 'Data Design', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'none', 10, 10, 0, 5),
  (20, 4, 'Interface Design', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'none', 10, 10, 0, 6),
  (21, 4, 'Requirements Traceability', 1, 0, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'none', 10, 10, 0, 7),

  (22, 5, 'Architecture Purpose', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'none', 10, 10, 0, 1),
  (23, 5, 'Stakeholders and Concerns', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'numbered', 10, 10, 0, 2),
  (24, 5, 'Architecture Viewpoints', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'numbered', 10, 10, 0, 3),
  (25, 5, 'Architecture Views', 1, 1, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'numbered', 10, 10, 0, 4),
  (26, 5, 'Architecture Decisions', 1, 0, 16, 'bold', 'left', 12, 'normal', 'justify', 1.5, 'none', 10, 10, 0, 5);

ALTER TABLE `users` AUTO_INCREMENT = 2;
ALTER TABLE `document_types` AUTO_INCREMENT = 4;
ALTER TABLE `standards` AUTO_INCREMENT = 7;
ALTER TABLE `templates` AUTO_INCREMENT = 6;
ALTER TABLE `template_versions` AUTO_INCREMENT = 6;
ALTER TABLE `template_section_versions` AUTO_INCREMENT = 27;
