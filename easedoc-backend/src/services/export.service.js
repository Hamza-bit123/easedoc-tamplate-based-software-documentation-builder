import puppeteer from "puppeteer-core";
import { getDocumentFullData } from "../models/export.model.js";
import generatePrintHTML from "../utils/generatePrintHTML.js";
import { Document, Packer, Paragraph, TextRun } from "docx";

export const exportPDFService = async (html, res) => {
  const browser = await puppeteer.launch({
    executablePath:
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
  });

  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "load" });

  const pdfBuffer = await page.pdf({
    printBackground: true,
  });

  await browser.close();

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": "attachment; filename=document.pdf",
  });

  res.send(pdfBuffer);
};
export const exportWordService = (documentId, res) => {
  getDocumentFullData(documentId, async (err, results) => {
    if (err) return res.status(500).send(err);

    if (!results.length) {
      return res.status(404).send("Document not found");
    }

    const docSections = [];

    results.forEach((sec) => {
      const title = sec.custom_title || sec.title;

      // TITLE
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: title,
              bold: true,
              size: sec.title_font_size * 2,
            }),
          ],
          alignment: sec.title_text_align || "left",
        }),
      );

      // BODY
      const content = (sec.content || "").split("\n");

      if (sec.list_type === "bullet") {
        content.forEach((line) => {
          docSections.push(
            new Paragraph({
              text: line,
              bullet: { level: 0 },
            }),
          );
        });
      } else if (sec.list_type === "numbered") {
        content.forEach((line) => {
          docSections.push(
            new Paragraph({
              text: line,
              numbering: {
                reference: "default-numbering",
                level: 0,
              },
            }),
          );
        });
      } else {
        content.forEach((line) => {
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  size: sec.body_font_size * 2,
                }),
              ],
              alignment: sec.body_text_align || "left",
            }),
          );
        });
      }

      docSections.push(new Paragraph({ text: "" }));
    });

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docSections,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": "attachment; filename=document.docx",
    });

    res.send(buffer);
  });
};
