import { exportPDFService } from "../services/export.service.js";

export const exportPDFController = (req, res) => {
  exportPDFService(req.params.id, res);
};
