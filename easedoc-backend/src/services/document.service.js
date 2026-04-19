import {
  createDocument,
  getDocumentById,
  getDocumentsByUser,
} from "../models/document.model.js";
import db from "../config/db.js";

export const createDocumentService = (data) => {
  return new Promise((resolve, reject) => {
    createDocument(data, (err, result) => {
      if (err) return reject(err);

      resolve({
        documentId: result.insertId,
      });
    });
  });
};

export const getDocumentService = (id) => {
  console.log("id" + id);
  return new Promise((resolve, reject) => {
    getDocumentById(id, (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

export const validateDocumentService = (documentId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT ts.id, ts.title, ts.is_required, ds.content
      FROM template_sections ts
      LEFT JOIN document_sections ds
        ON ts.id = ds.template_section_id
        AND ds.document_id = ?
      WHERE ts.template_id = (
        SELECT template_id FROM documents WHERE id = ?
      )
    `;

    db.query(sql, [documentId, documentId], (err, results) => {
      if (err) return reject(err);

      const errors = results
        .filter((r) => r.is_required && (!r.content || r.content.trim() === ""))
        .map((r) => ({
          section_id: r.id,
          message: `${r.title} is required`,
        }));

      resolve(errors);
    });
  });
};

export const getUserDocumentsService = (userId) => {
  return new Promise((resolve, reject) => {
    getDocumentsByUser(userId, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};
