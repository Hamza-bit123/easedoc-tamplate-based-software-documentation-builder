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

## Install

Run the SQL file against MySQL/MariaDB:

```sql
SOURCE database/easedoc.sql;
```

Default admin:

- Email: `admin@easedoc.local`
- Password: `admin123`
