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
  const { template, sections } = req.body;

  if (!template || !sections) {
    return res.status(400).send("Missing data");
  }

  exportWordService(template, sections, res);
};
