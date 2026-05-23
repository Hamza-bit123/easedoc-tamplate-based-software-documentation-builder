-- Add optional seed content blocks to template sections (figures for standards that use them).

ALTER TABLE `template_section_versions`
  ADD COLUMN `seed_blocks` json DEFAULT NULL AFTER `section_order`;

UPDATE `template_section_versions`
SET `seed_blocks` = '[{"type":"paragraph"},{"type":"image","optional":true,"caption":"External interface diagram"}]'
WHERE `id` = 4;

UPDATE `template_section_versions`
SET `seed_blocks` = '[{"type":"paragraph"},{"type":"image","optional":true,"caption":"System context diagram"}]'
WHERE `id` = 7;

UPDATE `template_section_versions`
SET `seed_blocks` = '[{"type":"paragraph"},{"type":"image","optional":true,"caption":"System architecture diagram"}]'
WHERE `id` = 11;

UPDATE `template_section_versions`
SET `seed_blocks` = '[{"type":"paragraph"},{"type":"image","optional":true,"caption":"Interface diagram"}]'
WHERE `id` = 13;

UPDATE `template_section_versions`
SET `seed_blocks` = '[{"type":"paragraph"},{"type":"image","optional":true,"caption":"Architectural design diagram"}]'
WHERE `id` = 17;

UPDATE `template_section_versions`
SET `seed_blocks` = '[{"type":"paragraph"},{"type":"image","optional":true,"caption":"Interface diagram"}]'
WHERE `id` = 20;

UPDATE `template_section_versions`
SET `seed_blocks` = '[{"type":"paragraph"},{"type":"image","optional":true,"caption":"Architecture view"}]'
WHERE `id` = 25;
