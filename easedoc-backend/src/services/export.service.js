import puppeteer from "puppeteer-core";
import { getDocumentFullData } from "../models/export.model.js";
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  AlignmentType,
  TextRun,
} from "docx";

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

export const exportWordService = async (template, sectionsMap, res) => {
  try {
    // ===== NUMBERING (same as preview)
    const addNumbering = (sections) => {
      const counters = {};

      return sections.map((sec) => {
        const level = sec.level || 1;

        if (!counters[level]) counters[level] = 0;
        counters[level]++;

        for (let i = level + 1; i <= 10; i++) {
          counters[i] = 0;
        }

        const number = Object.keys(counters)
          .slice(0, level)
          .map((lvl) => counters[lvl] || 0)
          .join(".");

        return { ...sec, number };
      });
    };

    template.sections = addNumbering(template.sections);

    const children = [];

    // ===== ALIGNMENT HELPER
    const getAlignment = (align) => {
      switch (align) {
        case "center":
          return AlignmentType.CENTER;
        case "right":
          return AlignmentType.RIGHT;
        case "justify":
          return AlignmentType.JUSTIFIED;
        default:
          return AlignmentType.LEFT;
      }
    };

    // ===== LOOP
    template.sections.forEach((sec) => {
      const contentObj = sectionsMap[sec.id];

      const title = contentObj?.title || sec.title;
      const content = contentObj?.content || "";

      const indent = (sec.padding_left || 0) + (sec.level - 1) * 200;

      // ================= TITLE =================
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${sec.number}. ${title}`,
              size: sec.title_font_size * 2,
              bold: sec.title_font_weight === "bold",
              color: "000000",
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: getAlignment(sec.title_text_align),

          spacing: {
            before: sec.margin_top * 10,
            after: (sec.margin_bottom + 10) * 10,
          },

          indent: {
            left: indent,
          },
        }),
      );

      const paragraphs = content.split("\n");

      paragraphs.forEach((p) => {
        if (!p.trim()) return;

        // ================= LIST =================
        if (sec.list_type === "bullet") {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: p,
                  size: sec.body_font_size * 2,
                  color: "000000",
                }),
              ],
              bullet: { level: 0 },
              alignment: getAlignment(sec.body_text_align),

              spacing: {
                before: 80,
                after: 100,
                line: sec.line_height * 240,
              },

              indent: {
                left: indent,
              },
            }),
          );
        } else if (sec.list_type === "numbered") {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: p,
                  size: sec.body_font_size * 2,
                  color: "000000",
                }),
              ],
              numbering: {
                reference: "default-numbering",
                level: 0,
              },
              alignment: getAlignment(sec.body_text_align),

              spacing: {
                before: 80,
                after: 100,
                line: sec.line_height * 240,
              },

              indent: {
                left: indent,
              },
            }),
          );
        }

        // ================= NORMAL PARAGRAPH =================
        else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: p,
                  size: sec.body_font_size * 2,
                  color: "000000",
                }),
              ],
              alignment: getAlignment(sec.body_text_align),

              spacing: {
                before: 80,
                after: 150,
                line: sec.line_height * 240,
              },

              indent: {
                left: indent,
              },
            }),
          );
        }
      });
    });

    // ================= DOCUMENT =================
    const doc = new Document({
      numbering: {
        config: [
          {
            reference: "default-numbering",
            levels: [
              {
                level: 0,
                format: "decimal",
                text: "%1.",
                alignment: AlignmentType.START,
              },
            ],
          },
        ],
      },
      sections: [
        {
          properties: {},
          children,
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
  } catch (err) {
    res.status(500).send("Word export failed");
  }
};
