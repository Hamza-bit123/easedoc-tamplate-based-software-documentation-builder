import db from "../config/db.js";

export const createDocument = (data, callback) => {
  const sql = `
    INSERT INTO documents (user_id, template_id, template_version_id, title)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [data.user_id, data.template_id, data.template_version_id, data.title], callback);
};

export const getDocumentById = (id, callback) => {
  db.query("SELECT * FROM documents WHERE id = ?", [id], callback);
};

export const getTemplateDocumentName = (templateId) => {
  return db
    .promise()
    .query("SELECT name FROM templates WHERE id = ?", [templateId])
    .then(([rows]) => rows[0]?.name || "Document");
};

export const getMatchingUserDocumentTitles = (userId, baseTitle) => {
  return db
    .promise()
    .query(
      "SELECT title FROM documents WHERE user_id = ? AND title LIKE ?",
      [userId, `${baseTitle}%`],
    )
    .then(([rows]) => rows.map((row) => row.title));
};

export const updateDocumentTitle = (documentId, userId, title) => {
  return db
    .promise()
    .query(
      "UPDATE documents SET title = ? WHERE id = ? AND user_id = ?",
      [title, documentId, userId],
    );
};

export const getDocumentsByUser = (userId, filters, callback) => {
  if (typeof filters === 'function') {
    callback = filters;
    filters = {};
  }

  let sql = `
    SELECT d.*, t.name AS template_name, dt.name AS doc_type_name, s.name AS standard_name
    FROM documents d
    JOIN templates t ON d.template_id = t.id
    JOIN document_types dt ON t.document_type_id = dt.id
    JOIN standards s ON t.standard_id = s.id
    WHERE d.user_id = ?
  `;
  const params = [userId];

  if (filters.search) {
    sql += ` AND (d.title LIKE ? OR dt.name LIKE ?)`;
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.docTypeId) {
    sql += ` AND dt.id = ?`;
    params.push(filters.docTypeId);
  }
  if (filters.standardId) {
    sql += ` AND s.id = ?`;
    params.push(filters.standardId);
  }

  sql += ` ORDER BY d.created_at DESC`;

  if (filters.limit) {
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(filters.limit), Number(filters.offset) || 0);
  }

  db.query(sql, params, callback);
};

export const countUserDocuments = (userId, filters, callback) => {
  if (typeof filters === 'function') {
    callback = filters;
    filters = {};
  }

  let sql = `
    SELECT COUNT(*) as total
    FROM documents d
    JOIN templates t ON d.template_id = t.id
    JOIN document_types dt ON t.document_type_id = dt.id
    JOIN standards s ON t.standard_id = s.id
    WHERE d.user_id = ?
  `;
  const params = [userId];

  if (filters.search) {
    sql += ` AND (d.title LIKE ? OR dt.name LIKE ?)`;
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.docTypeId) {
    sql += ` AND dt.id = ?`;
    params.push(filters.docTypeId);
  }
  if (filters.standardId) {
    sql += ` AND s.id = ?`;
    params.push(filters.standardId);
  }

  db.query(sql, params, callback);
};

export const deleteDocumentByOwner = (documentId, userId) => {
  return db
    .promise()
    .query("DELETE FROM documents WHERE id = ? AND user_id = ?", [documentId, userId]);
};
