import { getActiveVersion, getVersionSections } from "../models/template.model.js";
import {
  createDocument,
  getDocumentById,
  getMatchingUserDocumentTitles,
  getTemplateDocumentName,
  getDocumentsByUser,
  updateDocumentTitle,
  deleteDocumentByOwner,
  countUserDocuments,
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

const parseJsonPayload = (value) => {
  if (!value || typeof value !== "string") return value || null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const tableHasBodyContent = (tableData) => {
  const parsed = parseJsonPayload(tableData) || {};
  const source = Array.isArray(parsed) ? { rows: parsed } : parsed;
  const rows = Array.isArray(source.rows)
    ? source.rows
    : Array.isArray(source.cells)
      ? source.cells
      : [];
  const bodyRows = source.hasHeader === false ? rows : rows.slice(1);

  return bodyRows.some(
    (row) => Array.isArray(row) && row.some((cell) => hasText(cell)),
  );
};

const blockHasContent = (row) => {
  switch (row.block_type) {
    case "paragraph":
      return hasText(row.text_content);
    case "image":
      return hasText(row.image_src);
    case "table":
      return tableHasBodyContent(row.table_data);
    default:
      return false;
  }
};

const getTimestampCode = () => {
  const now = new Date();
  const pad = (value) => `${value}`.padStart(2, "0");

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
  ].join("");
};

const cleanDocumentTitle = (title) => `${title || ""}`.trim().replace(/\s+/g, " ");

const buildDefaultDocumentTitle = async (userId, templateId) => {
  const templateName = await getTemplateDocumentName(templateId);
  const baseTitle = `${templateName} - ${getTimestampCode()}`;
  const existingTitles = await getMatchingUserDocumentTitles(userId, baseTitle);

  if (!existingTitles.includes(baseTitle)) {
    return baseTitle;
  }

  let copyNumber = 2;
  while (existingTitles.includes(`${baseTitle} (${copyNumber})`)) {
    copyNumber += 1;
  }

  return `${baseTitle} (${copyNumber})`;
};

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

const ensureDocumentSectionBlocks = async (documentId, versionId) => {
  await db.promise().query(
    `INSERT INTO document_section_blocks
       (document_section_id, block_type, block_order, text_content)
     SELECT
       ds.id,
       'paragraph',
       1,
       ds.content
     FROM document_sections ds
     JOIN template_section_versions tsv
       ON ds.template_section_version_id = tsv.id
     LEFT JOIN document_section_blocks b
       ON b.document_section_id = ds.id
     WHERE ds.document_id = ?
       AND tsv.template_version_id = ?
       AND b.id IS NULL
       AND COALESCE(TRIM(ds.content), '') <> ''`,
    [documentId, versionId],
  );
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
  await ensureDocumentSectionBlocks(document.id, version.id);

  return {
    ...document,
    template_version_id: version.id,
  };
};

export const createDocumentService = async (data) => {
  // 1. get active version, or latest version for older predefined templates
  const version = await getTemplateVersionForUse(data.template_id);
  const title =
    cleanDocumentTitle(data.title) ||
    (await buildDefaultDocumentTitle(data.user_id, data.template_id));

  // 2. create document with version
  const result = await new Promise((resolve, reject) => {
    createDocument(
      {
        user_id: data.user_id,
        template_id: data.template_id,
        template_version_id: version.id,
        title,
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
        ds.content,
        b.block_type,
        b.text_content,
        b.image_src,
        b.table_data
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

    db.query(sql, [documentId], (err, results) => {
      if (err) return reject(err);

      const sectionsById = new Map();

      results.forEach((row) => {
        if (!sectionsById.has(row.id)) {
          sectionsById.set(row.id, {
            id: row.id,
            title: row.title,
            is_required: row.is_required,
            content: row.content,
            hasFilledBlock: false,
          });
        }

        if (row.block_type && blockHasContent(row)) {
          sectionsById.get(row.id).hasFilledBlock = true;
        }
      });

      const errors = Array.from(sectionsById.values())
        .filter(
          (r) =>
            r.is_required &&
            !hasText(r.content) &&
            !r.hasFilledBlock,
        )
        .map((r) => ({
          section_id: r.id,
          message: `${r.title} is required`,
        }));

      resolve(errors);
    });
  });
};

export const getUserDocumentsService = (userId, filters = {}) => {
  return new Promise((resolve, reject) => {
    getDocumentsByUser(userId, filters, (err, results) => {
      if (err) return reject(err);
      
      countUserDocuments(userId, filters, (errCount, countResults) => {
        if (errCount) return reject(errCount);
        
        const total = countResults[0].total;
        const limit = Number(filters.limit) || 10;
        const page = filters.page ? Number(filters.page) : 1;
        
        resolve({
          data: results,
          total,
          page,
          totalPages: Math.ceil(total / limit)
        });
      });
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

export const updateDocumentTitleService = async (documentId, userId, title) => {
  const cleanTitle = cleanDocumentTitle(title);

  if (!cleanTitle) {
    const error = new Error("Document title is required");
    error.statusCode = 400;
    throw error;
  }

  const [result] = await updateDocumentTitle(documentId, userId, cleanTitle);

  if (result.affectedRows === 0) {
    const error = new Error("Document not found");
    error.statusCode = 404;
    throw error;
  }

  return { title: cleanTitle };
};

export const deleteDocumentService = async (documentId, userId) => {
  const [result] = await deleteDocumentByOwner(documentId, userId);

  if (result.affectedRows === 0) {
    const error = new Error("Document not found or you are not the owner");
    error.statusCode = 403;
    throw error;
  }

  return { message: "Document deleted successfully" };
};
