import db from "../config/db.js";

export const getDocumentFullData = (documentId, callback) => {
  const sql = `
    SELECT 
      ts.*,
      ds.content,
      ds.custom_title,
      t.name,
      t.default_font_family,
      t.page_margin_top,
      t.page_margin_bottom,
      t.page_margin_left,
      t.page_margin_right
    FROM template_sections ts
    JOIN documents d ON d.template_id = ts.template_id
    LEFT JOIN document_sections ds 
      ON ds.template_section_id = ts.id AND ds.document_id = d.id
    JOIN templates t ON t.id = d.template_id
    WHERE d.id = ?
    ORDER BY ts.section_order ASC
  `;

  db.query(sql, [documentId], callback);
};
