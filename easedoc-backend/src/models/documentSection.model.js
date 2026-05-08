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
      data.template_section_version_id,
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
      tsv.title, 
      tsv.section_order
    FROM document_sections ds
    JOIN documents d ON ds.document_id = d.id
    JOIN template_section_versions tsv 
      ON ds.template_section_version_id = tsv.id
    JOIN template_versions tv
      ON tsv.template_version_id = tv.id AND d.template_version_id = tv.id
    WHERE ds.document_id = ?
    ORDER BY tsv.section_order ASC
  `;

  db.query(sql, [documentId], callback);
};
