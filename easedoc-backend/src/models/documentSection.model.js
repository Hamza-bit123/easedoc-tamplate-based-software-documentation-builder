import db from "../config/db.js";

export const upsertSection = (data, callback) => {
  const sql = `
    INSERT INTO document_sections 
    (document_id, template_section_id, content, custom_title)
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
    SELECT ds.*, ts.title, ts.section_order
    FROM document_sections ds
    JOIN template_sections ts 
      ON ds.template_section_id = ts.id
    WHERE ds.document_id = ?
    ORDER BY ts.section_order ASC
  `;

  db.query(sql, [documentId], callback);
};
