import { getDocumentTypesService } from "../services/documentType.service.js";

export const getDocumentTypesController = async (req, res) => {
  try {
    const types = await getDocumentTypesService();
    res.json(types);
  } catch (err) {
    res.status(500).json(err);
  }
};
