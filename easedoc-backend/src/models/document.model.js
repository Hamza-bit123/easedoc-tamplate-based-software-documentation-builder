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

export const getDocumentsByUser = (userId, callback) => {
  const sql = `
    SELECT d.*, t.name AS template_name
    FROM documents d
    JOIN templates t ON d.template_id = t.id
    WHERE d.user_id = ?
    ORDER BY d.created_at DESC
  `;

  db.query(sql, [userId], callback);
};
