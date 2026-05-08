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
      active
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      data.name,
      data.description,
      data.document_type_id,
      data.standard_id,
      data.created_by,
      data.active,
    ],
    callback,
  );
};

// ===== CREATE VERSION =====
export const createTemplateVersion = (data) => {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO template_versions (
        template_id,
        version_number,
        is_active,
        default_font_family,
        default_line_height,
        page_margin_top,
        page_margin_bottom,
        page_margin_left,
        page_margin_right
      ) VALUES (?, ?, true, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        data.template_id,
        data.version_number,
        data.default_font_family,
        data.default_line_height,
        data.page_margin_top,
        data.page_margin_bottom,
        data.page_margin_left,
        data.page_margin_right,
      ],
      (err, result) => {
        if (err) return reject(err);
        resolve(result.insertId);
      },
    );
  });
};

export const insertTemplateSectionVersions = (versionId, sections) => {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO template_section_versions (
        template_version_id,
        title,
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
        padding_left,

        section_order
      ) VALUES ?
    `;

    const values = sections.map((sec, index) => [
      versionId,
      sec.title,
      sec.level,
      sec.is_required,

      sec.title_font_size,
      sec.title_font_weight,
      sec.title_text_align,

      sec.body_font_size,
      sec.body_font_weight,
      sec.body_text_align,

      sec.line_height,
      sec.list_type,

      sec.margin_top,
      sec.margin_bottom,
      sec.padding_left,

      index + 1,
    ]);

    db.query(sql, [values], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

export const deactivateOldVersions = (templateId) => {
  return new Promise((resolve, reject) => {
    db.query(
      `UPDATE template_versions SET is_active = false WHERE template_id = ?`,
      [templateId],
      (err) => {
        if (err) return reject(err);
        resolve();
      },
    );
  });
};

export const getActiveVersion = (templateId) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT * FROM template_versions WHERE template_id = ? AND is_active = true LIMIT 1`,
      [templateId],
      (err, result) => {
        if (err) return reject(err);
        resolve(result[0]);
      },
    );
  });
};

export const getVersionSections = (versionId) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT * FROM template_section_versions WHERE template_version_id = ? ORDER BY section_order ASC`,
      [versionId],
      (err, results) => {
        if (err) return reject(err);
        resolve(results);
      },
    );
  });
};

export const getTemplatesByType = (typeId, standardId, callback) => {
  let sql = `
    SELECT 
      t.id, 
      t.name, 
      t.description, 
      t.created_at,
      s.name as standard_name,
      v.version_number as version,
      COALESCE(v.created_at, t.created_at) as updated_at
    FROM templates t
    LEFT JOIN standards s ON t.standard_id = s.id
    LEFT JOIN template_versions v ON v.id = (
      SELECT v2.id
      FROM template_versions v2
      WHERE v2.template_id = t.id
      ORDER BY v2.is_active DESC, v2.version_number DESC, v2.id DESC
      LIMIT 1
    )
    WHERE t.document_type_id = ? AND t.active = 1
  `;

  const params = [typeId];
  if (standardId !== "all") {
    sql += " AND t.standard_id = ?";
    params.push(standardId);
  }
  
  db.query(sql, params, callback);
};

export const getTemplateById = (id, callback) => {
  db.query("SELECT * FROM templates WHERE id = ?", [id], callback);
};

export const updateTemplateModel = (templateId, template) => {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE templates
      SET name = ?, description = ?
      WHERE id = ?
    `;

    const values = [
      template.name,
      template.description,
      templateId,
    ];

    db.query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};
