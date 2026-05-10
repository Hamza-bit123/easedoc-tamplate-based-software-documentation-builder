import {
  createTemplate,
  createTemplateVersion,
  insertTemplateSectionVersions,
  getTemplatesByType,
  getTemplateById,
  getActiveVersion,
  getVersionSections,
  updateTemplateModel,
  deactivateOldVersions,
} from "../models/template.model.js";
import db from "../config/db.js";

const getLatestVersion = async (templateId) => {
  const [rows] = await db.promise().query(
    `SELECT *
     FROM template_versions
     WHERE template_id = ?
     ORDER BY is_active DESC, version_number DESC, id DESC
     LIMIT 1`,
    [templateId],
  );

  return rows[0];
};

const getTemplateVersionForUse = async (templateId) => {
  const version = (await getActiveVersion(templateId)) || (await getLatestVersion(templateId));

  if (!version) {
    throw new Error("Template has no versions");
  }

  return version;
};

export const createTemplateService = async (data) => {
  const templateResult = await new Promise((resolve, reject) => {
    createTemplate(data, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

  const templateId = templateResult.insertId;

  // 👉 create version 1
  const versionId = await createTemplateVersion({
    template_id: templateId,
    version_number: 1,
    ...data,
  });

  // 👉 insert sections
  await insertTemplateSectionVersions(versionId, data.sections);

  return {
    message: "Template created with versioning",
    templateId,
  };
};

export const getTemplatesByTypeService = (typeId, standardId, userId) => {
  return new Promise((resolve, reject) => {
    // Modified to include user-customized templates for the current user
    let sql = `
      SELECT 
        t.id, 
        t.name, 
        t.description, 
        t.created_at,
        s.name as standard_name,
        v.version_number as version,
        COALESCE(v.created_at, t.created_at) as updated_at,
        t.base_template_id
      FROM templates t
      LEFT JOIN standards s ON t.standard_id = s.id
      LEFT JOIN template_versions v ON v.id = (
        SELECT v2.id
        FROM template_versions v2
        WHERE v2.template_id = t.id
        ORDER BY v2.is_active DESC, v2.version_number DESC, v2.id DESC
        LIMIT 1
      )
      WHERE t.document_type_id = ? AND t.active = 1 AND (t.base_template_id IS NULL OR t.created_by = ?)
    `;

    const params = [typeId, userId];
    if (standardId !== "all") {
      sql += " AND t.standard_id = ?";
      params.push(standardId);
    }
    
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export const getTemplateWithSectionsService = async (templateId) => {
  const templateResult = await new Promise((resolve, reject) => {
    getTemplateById(templateId, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

  if (templateResult.length === 0) {
    throw new Error("Template not found");
  }

  const template = templateResult[0];

  const activeVersion = await getTemplateVersionForUse(templateId);

  const sections = await getVersionSections(activeVersion.id);

  return {
    ...template,
    ...activeVersion,
    sections,
  };
};

export const getTemplateSpecificVersionService = async (templateId, versionId) => {
  const templateResult = await new Promise((resolve, reject) => {
    getTemplateById(templateId, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

  if (templateResult.length === 0) {
    throw new Error("Template not found");
  }

  const template = templateResult[0];

  const versionData = await new Promise((resolve, reject) => {
    db.query("SELECT * FROM template_versions WHERE id = ?", [versionId], (err, res) => {
      if (err) return reject(err);
      resolve(res[0]);
    });
  });

  if (!versionData) {
    throw new Error("Template version not found");
  }

  const sections = await getVersionSections(versionId);

  return {
    ...template,
    ...versionData,
    sections,
  };
};

export const updateTemplateService = async (templateId, template, sections) => {
  // 1. deactivate old versions
  await deactivateOldVersions(templateId);

  // 2. get latest version number
  const [rows] = await db
    .promise()
    .query(
      `SELECT MAX(version_number) as maxVersion FROM template_versions WHERE template_id = ?`,
      [templateId],
    );

  const newVersionNumber = (rows[0].maxVersion || 0) + 1;

  // 3. create new version
  const versionId = await createTemplateVersion({
    template_id: templateId,
    version_number: newVersionNumber,
    ...template,
  });

  // 4. insert sections
  await insertTemplateSectionVersions(versionId, sections);

  // 5. update template base info (optional)
  await updateTemplateModel(templateId, template);
};

export const getTemplateDetailsService = async (templateId) => {
  const [templateRows] = await db.promise().query(
    `SELECT t.*, s.name as standard_name, dt.name as document_type_name
     FROM templates t
     LEFT JOIN standards s ON t.standard_id = s.id
     LEFT JOIN document_types dt ON t.document_type_id = dt.id
     WHERE t.id = ?`,
    [templateId]
  );

  if (!templateRows.length) {
    throw new Error("Template not found");
  }

  const template = templateRows[0];

  const [versions] = await db.promise().query(
    `SELECT * FROM template_versions WHERE template_id = ? ORDER BY version_number DESC`,
    [templateId]
  );

  // Get customization count
  const [customizationRows] = await db.promise().query(
    `SELECT COUNT(*) as count FROM templates WHERE base_template_id = ?`,
    [templateId]
  );

  return {
    ...template,
    versions,
    customizationCount: customizationRows[0].count
  };
};

export const getTemplateUsageService = async (templateId) => {
  // Get all versions currently in the system for this template
  const [versions] = await db.promise().query(
    "SELECT id, version_number FROM template_versions WHERE template_id = ?",
    [templateId]
  );

  const versionIds = versions.map(v => v.id);

  // Get used versions (only those that actually belong to this template)
  const [usedRows] = await db.promise().query(
    "SELECT DISTINCT template_version_id FROM documents WHERE template_id = ? AND template_version_id IS NOT NULL",
    [templateId]
  );

  const usedIds = usedRows.map(row => row.template_version_id);
  
  // Filter versions into used and unused
  const unusedVersions = versions.filter(v => !usedIds.includes(v.id));
  const usedVersionsCount = versions.length - unusedVersions.length;

  return {
    totalVersions: versions.length,
    usedVersionsCount,
    unusedVersions,
    canDeleteTemplate: usedVersionsCount === 0
  };
};

export const deleteTemplateService = async (templateId) => {
  const usage = await getTemplateUsageService(templateId);

  if (usage.unusedVersions.length > 0) {
    const unusedIds = usage.unusedVersions.map(v => v.id);
    
    // Delete section versions first
    await db.promise().query(
      "DELETE FROM template_section_versions WHERE template_version_id IN (?)",
      [unusedIds]
    );

    // Delete unused template versions
    await db.promise().query(
      "DELETE FROM template_versions WHERE id IN (?)",
      [unusedIds]
    );
  }

  // If no versions left and template can be deleted, delete it
  if (usage.canDeleteTemplate) {
    // Delete the template (Note: Cascading delete on base_template_id is handled by DB)
    await db.promise().query("DELETE FROM templates WHERE id = ?", [templateId]);
    return { deletedTemplate: true, message: "Template and all versions deleted successfully." };
  }

  return { 
    deletedTemplate: false, 
    message: `Deleted ${usage.unusedVersions.length} unused versions. ${usage.usedVersionsCount} versions remain in use.` 
  };
};

export const customizeTemplateService = async (templateId, userId) => {
  try {
    // 1. Get base template
    const [templateRows] = await db.promise().query("SELECT * FROM templates WHERE id = ?", [templateId]);
    if (!templateRows.length) throw new Error("Base template not found");
    const baseTemplate = templateRows[0];

    // 2. Get active version, fallback to latest if none active
    let [versionRows] = await db.promise().query("SELECT * FROM template_versions WHERE template_id = ? AND is_active = 1", [templateId]);
    if (!versionRows.length) {
      [versionRows] = await db.promise().query("SELECT * FROM template_versions WHERE template_id = ? ORDER BY version_number DESC LIMIT 1", [templateId]);
    }
    
    if (!versionRows.length) throw new Error("Base template has no versions");
    const baseVersion = versionRows[0];

    // 3. Get sections
    const [sections] = await db.promise().query("SELECT * FROM template_section_versions WHERE template_version_id = ? ORDER BY section_order ASC", [baseVersion.id]);

    // 4. Create new template (copy)
    const [newTemplateResult] = await db.promise().query(
      `INSERT INTO templates
         (name, description, document_type_id, standard_id, created_by, base_template_id, active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        `${baseTemplate.name} (Customized)`,
        baseTemplate.description,
        baseTemplate.document_type_id,
        baseTemplate.standard_id,
        userId,
        templateId,
        1,
      ]
    );
    const newTemplateId = newTemplateResult.insertId;

    // 5. Create new version
    const [newVersionResult] = await db.promise().query(
      `INSERT INTO template_versions (template_id, version_number, is_active, 
        default_font_family, default_line_height, page_margin_top, page_margin_bottom, page_margin_left, page_margin_right)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)`,
      [
        newTemplateId,
        1,
        baseVersion.default_font_family,
        baseVersion.default_line_height,
        baseVersion.page_margin_top,
        baseVersion.page_margin_bottom,
        baseVersion.page_margin_left,
        baseVersion.page_margin_right
      ]
    );
    const newVersionId = newVersionResult.insertId;

    // 6. Copy sections
    if (sections.length > 0) {
      const sectionValues = sections.map((s, i) => [
        newVersionId, s.title, s.level, s.is_required, 
        s.title_font_size, s.title_font_weight, s.title_text_align,
        s.body_font_size, s.body_font_weight, s.body_text_align,
        s.line_height, s.list_type, s.margin_top, s.margin_bottom, s.padding_left, i + 1
      ]);
      await db.promise().query(
        `INSERT INTO template_section_versions (template_version_id, title, level, is_required, 
          title_font_size, title_font_weight, title_text_align,
          body_font_size, body_font_weight, body_text_align,
          line_height, list_type, margin_top, margin_bottom, padding_left, section_order)
         VALUES ?`,
        [sectionValues]
      );
    }

    return { id: newTemplateId, message: "Template customized successfully." };
  } catch (err) {
    throw err;
  }
};

export const getUserCustomizedTemplatesService = async (userId) => {
  const [rows] = await db.promise().query(
    `SELECT t.*, s.name as standard_name, dt.name as document_type_name, v.version_number as version
     FROM templates t
     LEFT JOIN standards s ON t.standard_id = s.id
     LEFT JOIN document_types dt ON t.document_type_id = dt.id
     LEFT JOIN template_versions v ON v.id = (
       SELECT v2.id
       FROM template_versions v2
       WHERE v2.template_id = t.id
       ORDER BY v2.is_active DESC, v2.version_number DESC, v2.id DESC
       LIMIT 1
     )
     WHERE t.created_by = ? AND t.base_template_id IS NOT NULL`,
    [userId]
  );
  return rows;
};
