import db from "../config/db.js";

export const upsertSection = (data, callback) => {
  const sql = `
    INSERT INTO document_sections 
    (document_id, template_section_version_id, content, custom_title)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      content = VALUES(content),
      custom_title = VALUES(custom_title)
  `;

  db.query(
    sql,
    [
      data.document_id,
      data.template_section_id,
      data.content,
      data.custom_title,
    ],
    callback,
  );
};

export const getSectionsByDocument = (documentId, callback) => {
  const sql = `
    SELECT 
      ds.*, 
      COALESCE(tsv.title, ts.title) as title, 
      COALESCE(tsv.section_order, ts.section_order) as section_order,
      ds.template_section_version_id as template_section_id
    FROM document_sections ds
    JOIN documents d ON ds.document_id = d.id
    LEFT JOIN template_section_versions tsv 
      ON ds.template_section_version_id = tsv.id AND d.template_version_id IS NOT NULL
    LEFT JOIN template_sections ts 
      ON ds.template_section_version_id = ts.id AND d.template_version_id IS NULL
    WHERE ds.document_id = ?
    ORDER BY section_order ASC
  `;

  db.query(sql, [documentId], callback);
};
