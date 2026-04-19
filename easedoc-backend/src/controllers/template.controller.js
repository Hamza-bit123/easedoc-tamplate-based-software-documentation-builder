import {
  createTemplateService,
  getTemplatesByTypeService,
  getTemplateWithSectionsService,
} from "../services/template.service.js";

export const createTemplateController = async (req, res) => {
  try {
    const data = {
      ...req.body,
      created_by: req.user.id,
    };

    console.log(data);
    if (!data.name || !data.document_type_id) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }
    if (!data.sections || data.sections.length === 0) {
      return res.status(400).json({
        message: "Template must have sections",
      });
    }

    if (!data.standard_id) {
      return res.status(400).json({
        message: "Standard is required",
      });
    }
    const result = await createTemplateService(data);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to create template",
    });
  }
};

export const getTemplatesByTypeController = async (req, res) => {
  try {
    const typeId = Number(req.params.typeId);
    const standardId = Number(req.query.standard_id);

    if (!standardId) {
      return res.status(400).json({ message: "standard_id required" });
    }

    const templates = await getTemplatesByTypeService(typeId, standardId);

    res.json(templates || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getTemplateWithSectionsController = async (req, res) => {
  try {
    const templateId = req.params.id;

    const template = await getTemplateWithSectionsService(templateId);

    res.json(template);
  } catch (err) {
    console.error(err);
    res.status(404).json({ message: "Template not found" });
  }
};
