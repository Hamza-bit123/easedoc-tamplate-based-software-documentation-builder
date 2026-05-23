import db from "../config/db.js";

const sectionUpsertSql = `
  INSERT INTO document_sections
  (document_id, template_section_version_id, content, custom_title)
  VALUES (?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    content = VALUES(content),
    custom_title = VALUES(custom_title),
    id = LAST_INSERT_ID(id)
`;

const getSectionParams = (data) => [
  data.document_id,
  data.template_section_version_id,
  data.content,
  data.custom_title,
];

const truncate = (value, maxLength) => {
  if (value === null || value === undefined || value === "") return null;
  const text = `${value}`;
  return text.length > maxLength ? text.slice(0, maxLength) : text;
};

const getBlockValues = (documentSectionId, blocks) =>
  blocks.map((block, index) => [
    documentSectionId,
    block.type,
    index + 1,
    block.text || null,
    block.image?.src || null,
    truncate(block.image?.alt, 255),
    block.image?.caption || null,
    block.tableData || null,
    block.metadata || null,
  ]);

const resolveDocumentSectionId = async (connection, data, upsertResult) => {
  if (upsertResult.insertId) {
    return upsertResult.insertId;
  }

  const [rows] = await connection.query(
    `SELECT id FROM document_sections
     WHERE document_id = ? AND template_section_version_id = ?`,
    [data.document_id, data.template_section_version_id],
  );

  return rows[0]?.id;
};

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

export const upsertSectionRow = async (data) => {
  const [result] = await db.promise().query(sectionUpsertSql, getSectionParams(data));

  return result.insertId;
};

export const replaceSectionBlocks = async (documentSectionId, blocks) => {
  await db
    .promise()
    .query("DELETE FROM document_section_blocks WHERE document_section_id = ?", [
      documentSectionId,
    ]);

  if (!blocks.length) {
    return;
  }

  const values = getBlockValues(documentSectionId, blocks);

  await db.promise().query(
    `INSERT INTO document_section_blocks
      (document_section_id, block_type, block_order, text_content, image_src,
       image_alt, image_caption, table_data, metadata)
     VALUES ?`,
    [values],
  );
};

export const saveSectionWithBlocks = async (data, blocks) => {
  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(sectionUpsertSql, getSectionParams(data));
    const documentSectionId = await resolveDocumentSectionId(connection, data, result);

    if (!documentSectionId) {
      throw new Error("Could not resolve document section id after save");
    }

    await connection.query(
      "DELETE FROM document_section_blocks WHERE document_section_id = ?",
      [documentSectionId],
    );

    if (blocks.length) {
      await connection.query(
        `INSERT INTO document_section_blocks
          (document_section_id, block_type, block_order, text_content, image_src,
           image_alt, image_caption, table_data, metadata)
         VALUES ?`,
        [getBlockValues(documentSectionId, blocks)],
      );
    }

    await connection.commit();
    return documentSectionId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const getSectionsByDocument = (documentId, callback) => {
  const sql = `
    SELECT 
      ds.*,
      tsv.title, 
      tsv.section_order,
      b.id AS block_id,
      b.block_type,
      b.block_order,
      b.text_content,
      b.image_src,
      b.image_alt,
      b.image_caption,
      b.table_data,
      b.metadata AS block_metadata
    FROM document_sections ds
    JOIN documents d ON ds.document_id = d.id
    JOIN template_section_versions tsv 
      ON ds.template_section_version_id = tsv.id
    JOIN template_versions tv
      ON tsv.template_version_id = tv.id AND d.template_version_id = tv.id
    LEFT JOIN document_section_blocks b
      ON b.document_section_id = ds.id
    WHERE ds.document_id = ?
    ORDER BY tsv.section_order ASC, b.block_order ASC, b.id ASC
  `;

  db.query(sql, [documentId], callback);
};
