import {
  getActiveVersion,
  getVersionSections,
} from "../models/template.model.js";
import {
  createDocument,
  getDocumentById,
  getDocumentsByUser,
} from "../models/document.model.js";
import db from "../config/db.js";

export const createDocumentService = async (data) => {
  // 1. get active version
  const version = await getActiveVersion(data.template_id);

  // 2. create document with version
  const result = await new Promise((resolve, reject) => {
    createDocument(
      {
        user_id: data.user_id,
        template_id: data.template_id,
        template_version_id: version ? version.id : null,
        title: data.title,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      },
    );
  });

  const documentId = result.insertId;

  // 3. get sections
  let sections = [];
  if (version) {
    sections = await getVersionSections(version.id);
  } else {
    sections = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM template_sections WHERE template_id = ? ORDER BY section_order ASC",
        [data.template_id],
        (err, res) => {
          if (err) return reject(err);
          resolve(res);
        }
      );
    });
  }

  // 4. insert document_sections
  for (const sec of sections) {
    await db.promise().query(
      `INSERT INTO document_sections (document_id, template_section_version_id, content)
       VALUES (?, ?, '')`,
      [documentId, sec.id],
    );
  }

  return { documentId };
};

export const getDocumentService = (id) => {
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
      SELECT 
        COALESCE(tsv.id, ts.id) as id,
        COALESCE(tsv.title, ts.title) as title, 
        COALESCE(tsv.is_required, ts.is_required) as is_required, 
        ds.content
      FROM document_sections ds
      JOIN documents d ON ds.document_id = d.id
      LEFT JOIN template_section_versions tsv 
        ON ds.template_section_version_id = tsv.id AND d.template_version_id IS NOT NULL
      LEFT JOIN template_sections ts 
        ON ds.template_section_version_id = ts.id AND d.template_version_id IS NULL
      WHERE ds.document_id = ?
    `;

    db.query(sql, [documentId], (err, results) => {
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

export const updateDocumentStatusService = async (documentId, status) => {
  return new Promise((resolve, reject) => {
    db.query(
      "UPDATE documents SET status = ? WHERE id = ?",
      [status, documentId],
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
  });
};
