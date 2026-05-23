import {
  createDocumentService,
  getDocumentService,
  validateDocumentService,
  getUserDocumentsService,
  updateDocumentStatusService,
  updateDocumentTitleService,
  deleteDocumentService,
} from "../services/document.service.js";

export const createDocumentController = async (req, res) => {
  try {
    const data = {
      user_id: req.user.id,
      template_id: req.body.template_id,
      title: req.body.title,
    };

    const result = await createDocumentService(data);

    res.json(result);
  } catch (err) {
    res.status(500).json({
      message: err.message || "Error creating document",
    });
  }
};

export const getDocumentController = async (req, res) => {
  try {
    const doc = await getDocumentService(req.params.id);
    res.json(doc);
  } catch (err) {
    res.status(500).json({
      message: err.message || "Error fetching document",
    });
  }
};

export const validateDocumentController = async (req, res) => {
  try {
    const errors = await validateDocumentService(req.params.id);
    res.json({ errors });
  } catch (err) {
    res.status(500).json(err);
  }
};

export const getUserDocumentsController = async (req, res) => {
  try {
    const docs = await getUserDocumentsService(req.user.id);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: "Error fetching documents" });
  }
};

export const updateDocumentStatusController = async (req, res) => {
  try {
    const { status } = req.body;
    await updateDocumentStatusService(req.params.id, status);
    res.json({ message: "Document status updated" });
  } catch (err) {
    res.status(500).json({ message: "Error updating status" });
  }
};

export const updateDocumentTitleController = async (req, res) => {
  try {
    const result = await updateDocumentTitleService(
      req.params.id,
      req.user.id,
      req.body.title,
    );
    res.json({ message: "Document title updated", ...result });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      message: err.message || "Error updating title",
    });
  }
};

export const deleteDocumentController = async (req, res) => {
  try {
    const result = await deleteDocumentService(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({
      message: err.message || "Error deleting document",
    });
  }
};
