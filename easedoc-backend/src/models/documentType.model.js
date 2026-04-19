import db from "../config/db.js";

export const getDocumentTypes = (callback) => {
  db.query("SELECT * FROM document_types", callback);
};
