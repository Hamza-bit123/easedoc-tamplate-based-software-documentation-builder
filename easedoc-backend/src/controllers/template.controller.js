import {
  createTemplateService,
  getTemplatesByTypeService,
  getTemplateWithSectionsService,
  getTemplateSpecificVersionService,
  updateTemplateService,
  getTemplateDetailsService,
  getTemplateUsageService,
  deleteTemplateService,
  customizeTemplateService,
  getUserCustomizedTemplatesService,
} from "../services/template.service.js";

export const createTemplateController = async (req, res) => {
  try {
    const data = {
      ...req.body,
      created_by: req.user.id,
    };


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
    res.status(500).json({
      message: "Failed to create template",
    });
  }
};

export const getTemplatesByTypeController = async (req, res) => {
  try {
    const typeId = Number(req.params.typeId);
    let standardId = req.query.standard_id;
    const userId = req.user.id;

    if (!standardId) {
      return res.status(400).json({ message: "standard_id required" });
    }

    if (standardId !== "all") standardId = Number(standardId);

    const templates = await getTemplatesByTypeService(typeId, standardId, userId);

    res.json(templates || []);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getTemplateWithSectionsController = async (req, res) => {
  try {
    const templateId = req.params.id;

    const template = await getTemplateWithSectionsService(templateId);

    res.json(template);
  } catch (err) {
    res.status(404).json({ message: "Template not found" });
  }
};

export const getTemplateSpecificVersionController = async (req, res) => {
  try {
    const templateId = req.params.id;
    const versionId = req.params.versionId;

    const template = await getTemplateSpecificVersionService(templateId, versionId);

    res.json(template);
  } catch (err) {
    res.status(404).json({ message: "Template version not found" });
  }
};

export const updateTemplateController = async (req, res) => {
  try {
    const templateId = req.params.id;
    const { template, sections } = req.body;

    if (!template || !sections) {
      return res.status(400).send("Missing template or sections data");
    }

    await updateTemplateService(templateId, template, sections);

    res.json({ message: "Template updated successfully" });
  } catch (err) {
    res.status(500).send("Update template failed");
  }
};

export const getTemplateDetailsController = async (req, res) => {
  try {
    const templateId = req.params.id;
    const details = await getTemplateDetailsService(templateId);
    res.json(details);
  } catch (err) {
    res.status(500).json({ message: "Failed to load template details" });
  }
};

export const getTemplateUsageController = async (req, res) => {
  try {
    const templateId = req.params.id;

    // Ownership check for non-admins
    if (req.user.role !== "admin") {
      const details = await getTemplateDetailsService(templateId);
      if (details.created_by !== req.user.id) {
        return res.status(403).json({ message: "You can only view usage for your own templates." });
      }
    }

    const usage = await getTemplateUsageService(templateId);
    res.json(usage);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch template usage info" });
  }
};

export const deleteTemplateController = async (req, res) => {
  try {
    const templateId = req.params.id;
    
    // Ownership check for non-admins
    if (req.user.role !== "admin") {
      const details = await getTemplateDetailsService(templateId);
      if (details.created_by !== req.user.id) {
        return res.status(403).json({ message: "You can only delete your own templates." });
      }
    }

    const result = await deleteTemplateService(templateId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to delete template/versions" });
  }
};

export const customizeTemplateController = async (req, res) => {
  try {
    const templateId = req.params.id;
    const userId = req.user.id;
    const result = await customizeTemplateService(templateId, userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to customize template" });
  }
};

export const getUserCustomizedTemplatesController = async (req, res) => {
  try {
    const userId = req.user.id;
    const templates = await getUserCustomizedTemplatesService(userId);
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch customized templates" });
  }
};
