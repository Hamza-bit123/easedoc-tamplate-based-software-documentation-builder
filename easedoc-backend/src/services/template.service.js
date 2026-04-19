import {
  createTemplate,
  addTemplateSections,
  getTemplatesByType,
  getTemplateById,
  getTemplateSections,
} from "../models/template.model.js";

export const createTemplateService = (data) => {
  return new Promise((resolve, reject) => {
    createTemplate(data, (err, result) => {
      if (err) return reject(err);

      const templateId = result.insertId;

      const sections = data.sections.map((sec, index) => ({
        template_id: templateId,
        title: sec.title,
        section_order: index + 1,
        level: sec.level || 1,
        is_required: sec.is_required ?? true,

        // TITLE
        title_font_size: sec.title_font_size ?? 16,
        title_font_weight: sec.title_font_weight ?? "bold",
        title_text_align: sec.title_text_align ?? "left",

        // BODY
        body_font_size: sec.body_font_size ?? 12,
        body_font_weight: sec.body_font_weight ?? "normal",
        body_text_align: sec.body_text_align ?? "left",

        line_height: sec.line_height ?? 1.5,
        list_type: sec.list_type ?? "none",

        margin_top: sec.margin_top ?? 10,
        margin_bottom: sec.margin_bottom ?? 10,
        padding_left: sec.padding_left ?? 0,
      }));
      addTemplateSections(sections, (err) => {
        if (err) return reject(err);

        resolve({
          message: "Template created with full formatting",
          templateId,
        });
      });
    });
  });
};

export const getTemplatesByTypeService = (typeId, standardId) => {
  return new Promise((resolve, reject) => {
    getTemplatesByType(typeId, standardId, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export const getTemplateWithSectionsService = (templateId) => {
  return new Promise((resolve, reject) => {
    getTemplateById(templateId, (err, templateResult) => {
      if (err) return reject(err);

      if (templateResult.length === 0)
        return reject(new Error("Template not found"));

      const template = templateResult[0];

      getTemplateSections(templateId, (err, sections) => {
        if (err) return reject(err);

        resolve({
          ...template,
          sections,
        });
      });
    });
  });
};
