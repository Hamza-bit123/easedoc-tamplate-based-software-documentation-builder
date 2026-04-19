import PDFDocument from "pdfkit";
import db from "../config/db.js";

export const exportPDFService = (documentId, res) => {
  const sql = `
    SELECT ts.*, ds.content, t.default_font_family
    FROM template_sections ts
    JOIN documents d ON d.template_id = ts.template_id
    LEFT JOIN document_sections ds 
      ON ds.template_section_id = ts.id AND ds.document_id = d.id
    JOIN templates t ON t.id = d.template_id
    WHERE d.id = ?
    ORDER BY ts.section_order ASC
  `;

  db.query(sql, [documentId], (err, results) => {
    if (err) return res.status(500).send(err);

    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=document.pdf");

    doc.pipe(res);

    results.forEach((sec) => {
      // TITLE
      doc
        .fontSize(sec.font_size || 16)
        .text(sec.title, { align: sec.text_align || "left" });

      doc.moveDown(0.5);

      // CONTENT
      doc.fontSize(12).text(sec.content || "", {
        align: sec.text_align || "left",
        lineGap: sec.line_height || 4,
      });

      doc.moveDown();
    });

    doc.end();
  });
};
