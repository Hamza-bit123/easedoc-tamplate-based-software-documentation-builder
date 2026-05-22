import db from "../config/db.js";

export const getDocumentFullData = (documentId, callback) => {
  const sql = `
    SELECT 
      tsv.*,
      ds.content,
      ds.custom_title,
      b.id AS block_id,
      b.block_type,
      b.block_order,
      b.text_content,
      b.image_src,
      b.image_alt,
      b.image_caption,
      b.table_data,
      b.metadata AS block_metadata,
      t.name,
      tv.default_font_family,
      tv.page_margin_top,
      tv.page_margin_bottom,
      tv.page_margin_left,
      tv.page_margin_right
    FROM documents d
    JOIN template_versions tv ON d.template_version_id = tv.id
    JOIN template_section_versions tsv ON tsv.template_version_id = tv.id
    LEFT JOIN document_sections ds 
      ON ds.template_section_version_id = tsv.id AND ds.document_id = d.id
    LEFT JOIN document_section_blocks b
      ON b.document_section_id = ds.id
    JOIN templates t ON t.id = d.template_id
    WHERE d.id = ?
    ORDER BY tsv.section_order ASC, b.block_order ASC, b.id ASC
  `;

  db.query(sql, [documentId], callback);
};
