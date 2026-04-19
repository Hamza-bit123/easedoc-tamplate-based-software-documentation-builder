import {
  upsertSection,
  getSectionsByDocument,
} from "../models/documentSection.model.js";

export const saveSectionService = (data) => {
  return new Promise((resolve, reject) => {
    upsertSection(data, (err) => {
      if (err) return reject(err);
      resolve({ message: "Section saved" });
    });
  });
};

export const getSectionsService = (documentId) => {
  return new Promise((resolve, reject) => {
    getSectionsByDocument(documentId, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};
