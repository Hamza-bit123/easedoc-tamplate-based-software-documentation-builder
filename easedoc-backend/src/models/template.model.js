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
      template_id, title, section_order, is_required,
      font_size, font_weight, text_align,
      line_height, list_type, bullet_style,
      margin_top, margin_bottom, padding_left
    ) VALUES ?
  `;

  const values = sections.map((s) => [
    s.template_id,
    s.title,
    s.section_order,
    s.is_required,
    s.font_size,
    s.font_weight,
    s.text_align,
    s.line_height,
    s.list_type,
    s.bullet_style,
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
