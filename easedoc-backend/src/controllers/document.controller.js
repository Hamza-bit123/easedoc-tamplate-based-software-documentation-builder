import {
  createDocumentService,
  getDocumentService,
  validateDocumentService,
  getUserDocumentsService,
} from "../services/document.service.js";

export const createDocumentController = async (req, res) => {
  try {
    const data = {
      user_id: req.user.id,
      template_id: req.body.template_id,
      title: req.body.title || "Untitled Document",
    };

    const result = await createDocumentService(data);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating document" });
  }
};

export const getDocumentController = async (req, res) => {
  try {
    const doc = await getDocumentService(req.params.id);
    res.json(doc);
  } catch (err) {
    res.status(500).json(err);
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
    console.log("req.user.id");
    const docs = await getUserDocumentsService(req.user.id);
    console.log("user id: " + req.user.id);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: "Error fetching documents" });
  }
};
