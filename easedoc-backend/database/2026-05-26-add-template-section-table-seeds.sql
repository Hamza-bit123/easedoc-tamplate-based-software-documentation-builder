-- Add optional table seed blocks to default template sections that commonly use matrices.
-- Run after 2026-05-23-add-template-section-seed-blocks.sql so seed_blocks exists.

UPDATE `template_section_versions`
SET `seed_blocks` = '[{"type":"paragraph"},{"type":"table","optional":true,"caption":"Functional requirements summary","columns":["Requirement ID","Description","Priority","Source"],"rowCount":4}]'
WHERE `id` = 3;

UPDATE `template_section_versions`
SET `seed_blocks` = '[{"type":"paragraph"},{"type":"table","optional":true,"caption":"Verification matrix","columns":["Requirement ID","Verification Method","Acceptance Criteria","Status"],"rowCount":4}]'
WHERE `id` = 9;

UPDATE `template_section_versions`
SET `seed_blocks` = '[{"type":"paragraph"},{"type":"table","optional":true,"caption":"Data entity summary","columns":["Entity","Description","Owner","Retention"],"rowCount":4}]'
WHERE `id` = 12;

UPDATE `template_section_versions`
SET `seed_blocks` = '[{"type":"paragraph"},{"type":"table","optional":true,"caption":"Component responsibility table","columns":["Component","Responsibility","Interfaces","Dependencies"],"rowCount":4}]'
WHERE `id` = 18;

UPDATE `template_section_versions`
SET `seed_blocks` = '[{"type":"paragraph"},{"type":"table","optional":true,"caption":"Requirements traceability matrix","columns":["Requirement ID","Design Element","Verification Method","Status"],"rowCount":4}]'
WHERE `id` = 21;

UPDATE `template_section_versions`
SET `seed_blocks` = '[{"type":"paragraph"},{"type":"table","optional":true,"caption":"Stakeholder concern matrix","columns":["Stakeholder","Concern","Viewpoint","Priority"],"rowCount":4}]'
WHERE `id` = 23;

UPDATE `template_section_versions`
SET `seed_blocks` = '[{"type":"paragraph"},{"type":"table","optional":true,"caption":"Viewpoint concern mapping","columns":["Viewpoint","Concern","Model Kind","Stakeholder"],"rowCount":4}]'
WHERE `id` = 24;
