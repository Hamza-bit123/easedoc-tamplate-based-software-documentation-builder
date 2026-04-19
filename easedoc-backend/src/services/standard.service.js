import { getStandardsByType } from "../models/standard.model.js";

export const getStandardsByTypeService = (typeId) => {
  return new Promise((resolve, reject) => {
    getStandardsByType(typeId, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};
