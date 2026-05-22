-- Add ordered content blocks inside each saved document section.
-- Existing document_sections.content values are preserved and copied into
-- one paragraph block per section when no blocks exist yet.

CREATE TABLE IF NOT EXISTS `document_section_blocks` (
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

INSERT INTO `document_section_blocks`
  (`document_section_id`, `block_type`, `block_order`, `text_content`)
SELECT
  ds.id,
  'paragraph',
  1,
  ds.content
FROM `document_sections` ds
LEFT JOIN `document_section_blocks` b
  ON b.document_section_id = ds.id
WHERE b.id IS NULL
  AND COALESCE(TRIM(ds.content), '') <> '';
