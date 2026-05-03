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
