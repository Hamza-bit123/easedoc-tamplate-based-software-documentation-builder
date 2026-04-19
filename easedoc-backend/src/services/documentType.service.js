import { getDocumentTypes } from "../models/documentType.model.js";

export const getDocumentTypesService = () => {
  return new Promise((resolve, reject) => {
    getDocumentTypes((err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};
