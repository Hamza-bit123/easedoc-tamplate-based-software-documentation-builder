import {
  saveSectionService,
  getSectionsService,
} from "../services/documentSection.service.js";

export const saveSectionController = async (req, res) => {
  try {
    const result = await saveSectionService(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json(err);
  }
};

export const getSectionsController = async (req, res) => {
  try {
    const sections = await getSectionsService(req.params.documentId);
    res.json(sections);
  } catch (err) {
    res.status(500).json(err);
  }
};
