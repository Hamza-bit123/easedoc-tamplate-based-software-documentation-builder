import { getActiveVersion, getVersionSections } from "../models/template.model.js";
import {
  createDocument,
  getDocumentById,
  getDocumentsByUser,
} from "../models/document.model.js";
import db from "../config/db.js";

const getLatestVersion = async (templateId) => {
  const [rows] = await db
    .promise()
    .query(
      `SELECT * FROM template_versions
       WHERE template_id = ?
       ORDER BY is_active DESC, version_number DESC, id DESC
       LIMIT 1`,
      [templateId],
    );

  return rows[0];
};

const getTemplateVersionForUse = async (templateId) => {
  const version =
    (await getActiveVersion(templateId)) || (await getLatestVersion(templateId));

  if (!version) {
    throw new Error("Template has no versions");
  }

  return version;
};

const normalizeTitle = (value) => (value || "").trim().toLowerCase();

const hasText = (value) => value !== null && value !== undefined && `${value}`.trim() !== "";

const repairDocumentSections = async (documentId, versionId) => {
  const versionSections = await getVersionSections(versionId);

  if (versionSections.length === 0) {
    throw new Error("Template version has no sections");
  }

  const [rows] = await db.promise().query(
    `SELECT
       ds.id,
       ds.template_section_version_id,
       ds.content,
       ds.custom_title,
       tsv.template_version_id,
       tsv.title,
       tsv.section_order
     FROM document_sections ds
     LEFT JOIN template_section_versions tsv
       ON ds.template_section_version_id = tsv.id
     WHERE ds.document_id = ?
     ORDER BY COALESCE(tsv.section_order, ds.id), ds.id`,
    [documentId],
  );

  const rowsByCurrentSection = new Map(
    rows
      .filter((row) => row.template_version_id === versionId)
      .map((row) => [row.template_section_version_id, row]),
  );

  const legacyRows = rows.filter(
    (row) =>
      row.template_version_id !== versionId &&
      (hasText(row.content) || hasText(row.custom_title)),
  );
  const usedLegacyRowIds = new Set();

  const findLegacyRow = (section) => {
    const sectionTitle = normalizeTitle(section.title);
    const titleMatch = legacyRows.find((row) => {
      if (usedLegacyRowIds.has(row.id)) return false;
      return (
        normalizeTitle(row.custom_title) === sectionTitle ||
        normalizeTitle(row.title) === sectionTitle
      );
    });

    if (titleMatch) return titleMatch;

    return legacyRows.find((row) => !usedLegacyRowIds.has(row.id));
  };

  for (const section of versionSections) {
    const currentRow = rowsByCurrentSection.get(section.id);
    const currentHasContent =
      currentRow && (hasText(currentRow.content) || hasText(currentRow.custom_title));

    if (currentHasContent) {
      continue;
    }

    const legacyRow = findLegacyRow(section);
    if (legacyRow) {
      usedLegacyRowIds.add(legacyRow.id);
    }

    const content = legacyRow?.content || currentRow?.content || "";
    const customTitle = legacyRow?.custom_title || currentRow?.custom_title || null;

    await db.promise().query(
      `INSERT INTO document_sections
         (document_id, template_section_version_id, content, custom_title)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         content = IF(COALESCE(content, '') = '', VALUES(content), content),
         custom_title = IF(custom_title IS NULL OR custom_title = '', VALUES(custom_title), custom_title)`,
      [documentId, section.id, content, customTitle],
    );
  }
};

const ensureDocumentVersion = async (document) => {
  if (!document) {
    return document;
  }

  const version = document.template_version_id
    ? { id: document.template_version_id }
    : await getTemplateVersionForUse(document.template_id);

  if (!document.template_version_id) {
    await db.promise().query("UPDATE documents SET template_version_id = ? WHERE id = ?", [
      version.id,
      document.id,
    ]);
  }

  await repairDocumentSections(document.id, version.id);

  return {
    ...document,
    template_version_id: version.id,
  };
};

export const createDocumentService = async (data) => {
  // 1. get active version, or latest version for older predefined templates
  const version = await getTemplateVersionForUse(data.template_id);

  // 2. create document with version
  const result = await new Promise((resolve, reject) => {
    createDocument(
      {
        user_id: data.user_id,
        template_id: data.template_id,
        template_version_id: version.id,
        title: data.title,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      },
    );
  });

  const documentId = result.insertId;

  await repairDocumentSections(documentId, version.id);

  return { documentId };
};

export const getDocumentService = (id) => {
  return new Promise((resolve, reject) => {
    getDocumentById(id, (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  }).then(ensureDocumentVersion);
};

export const validateDocumentService = async (documentId) => {
  await getDocumentService(documentId);

  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        tsv.id,
        tsv.title, 
        tsv.is_required, 
        ds.content
      FROM document_sections ds
      JOIN documents d ON ds.document_id = d.id
      JOIN template_section_versions tsv 
        ON ds.template_section_version_id = tsv.id
      JOIN template_versions tv
        ON tsv.template_version_id = tv.id AND d.template_version_id = tv.id
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
