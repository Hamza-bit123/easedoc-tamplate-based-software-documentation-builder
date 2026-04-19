import db from "../config/db.js";

export const getStandardsByType = (typeId, callback) => {
  const sql = `
    SELECT * FROM standards
    WHERE document_type_id = ? AND active = 1
  `;

  db.query(sql, [typeId], callback);
};
