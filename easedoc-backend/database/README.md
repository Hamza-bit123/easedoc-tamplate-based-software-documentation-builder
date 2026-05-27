# EaseDoc Database Files

`easedoc.sql` is the canonical clean bootstrap for a fresh EaseDoc install.

## Removed From Clean Schema

- `template_sections`: deprecated after template versioning. Runtime code now uses `template_versions` and `template_section_versions`.
- `templates.default_font_family`
- `templates.default_line_height`
- `templates.page_margin_top`
- `templates.page_margin_bottom`
- `templates.page_margin_left`
- `templates.page_margin_right`

Those template formatting/page settings belong to `template_versions`, because each version can have different formatting.

## Kept Tables

- `users`
- `document_types`
- `standards`
- `templates`
- `template_versions`
- `template_section_versions`
- `documents`
- `document_sections`
- `document_section_blocks`

`document_section_blocks` stores the ordered body content for each saved
section. Paragraphs, images, and table blocks are separate rows so rich content
is never embedded inside paragraph text.

## Migrations

For an existing database, run:

```sql
SOURCE database/2026-05-22-add-document-section-blocks.sql;
SOURCE database/2026-05-23-add-template-section-seed-blocks.sql;
SOURCE database/2026-05-26-add-template-section-table-seeds.sql;
```

The migration preserves `document_sections.content` and copies any existing
section text into a paragraph block when that section has no blocks yet.

`2026-05-23-add-template-section-seed-blocks.sql` adds `seed_blocks` to
`template_section_versions` and seeds optional figure placeholders on sections
where the bundled standards commonly use diagrams.

`2026-05-26-add-template-section-table-seeds.sql` adds optional table
placeholders to standard sections that commonly use summary, verification,
traceability, stakeholder, or viewpoint matrices.

## Install

Run the SQL file against MySQL/MariaDB:

```sql
SOURCE database/easedoc.sql;
```

Default admin:

- Email: `admin@easedoc.local`
- Password: `admin123`
