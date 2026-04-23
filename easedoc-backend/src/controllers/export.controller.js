import {
  exportPDFService,
  exportWordService,
} from "../services/export.service.js";

export const exportPDFController = (req, res) => {
  const { html } = req.body;

  if (!html) {
    return res.status(400).send("HTML is required");
  }
  exportPDFService(req.body.html, res);
};

export const exportWordController = (req, res) => {
  exportWordService(req.params.id, res);
};
