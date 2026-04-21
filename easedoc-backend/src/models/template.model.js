import db from "../config/db.js";

// CREATE TEMPLATE
export const createTemplate = (data, callback) => {
  const sql = `
    INSERT INTO templates (
      name,
      description,
      document_type_id,
      standard_id,
      created_by,
      active,
      default_font_family,
      default_line_height,
      page_margin_top,
      page_margin_bottom,
      page_margin_left,
      page_margin_right
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      data.name,
      data.description,
      data.document_type_id,
      data.standard_id, // ✅ ADD THIS
      data.created_by,
      data.active,
      data.default_font_family,
      data.default_line_height,
      data.page_margin_top,
      data.page_margin_bottom,
      data.page_margin_left,
      data.page_margin_right,
    ],
    callback,
  );
};

// INSERT SECTIONS
export const addTemplateSections = (sections, callback) => {
  const sql = `
    INSERT INTO template_sections (
      template_id,
      title,
      section_order,
      level,
      is_required,

      title_font_size,
      title_font_weight,
      title_text_align,

      body_font_size,
      body_font_weight,
      body_text_align,

      line_height,
      list_type,

      margin_top,
      margin_bottom,
      padding_left
    ) VALUES ?
  `;

  const values = sections.map((s) => [
    s.template_id,
    s.title,
    s.section_order,
    s.level,
    s.is_required,

    s.title_font_size,
    s.title_font_weight,
    s.title_text_align,

    s.body_font_size,
    s.body_font_weight,
    s.body_text_align,

    s.line_height,
    s.list_type,

    s.margin_top,
    s.margin_bottom,
    s.padding_left,
  ]);

  db.query(sql, [values], callback);
};

export const getTemplatesByType = (typeId, standardId, callback) => {
  const sql = `
    SELECT * FROM templates
    WHERE document_type_id = ?
    AND standard_id = ?
    AND active = 1
  `;

  db.query(sql, [typeId, standardId], callback);
};

export const getTemplateById = (id, callback) => {
  db.query("SELECT * FROM templates WHERE id = ?", [id], callback);
};

export const getTemplateSections = (templateId, callback) => {
  const sql = `
    SELECT *
    FROM template_sections
    WHERE template_id = ?
    ORDER BY section_order ASC
  `;
  db.query(sql, [templateId], callback);
};
