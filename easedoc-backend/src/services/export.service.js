import puppeteer from "puppeteer-core";
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  AlignmentType,
  TextRun,
  ImageRun,
} from "docx";

const getSectionBlocks = (contentObj = {}) => {
  if (Array.isArray(contentObj.blocks) && contentObj.blocks.length > 0) {
    return contentObj.blocks.map((block) => ({
      type: block.type || block.block_type || "paragraph",
      text: block.text ?? block.text_content ?? "",
      image: {
        src: block.image?.src || block.image_src || "",
        alt: block.image?.alt || block.image_alt || "",
        caption: block.image?.caption || block.image_caption || "",
      },
      tableData: block.tableData || block.table_data || null,
    }));
  }

  return [
    {
      type: "paragraph",
      text: contentObj.content || "",
      image: { src: "", alt: "", caption: "" },
      tableData: null,
    },
  ];
};

const imageRunFromDataUrl = (src) => {
  const match = `${src}`.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  const imageType = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  const supportedTypes = new Set(["png", "jpg", "gif", "bmp"]);

  if (!supportedTypes.has(imageType)) {
    return null;
  }

  return new ImageRun({
    type: imageType,
    data: Buffer.from(match[2], "base64"),
    transformation: {
      width: 440,
      height: 260,
    },
  });
};

export const exportPDFService = async (html, res) => {
  const browser = await puppeteer.launch({
    executablePath:
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
  });

  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "load" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    margin: {
      top: "0mm",
      right: "0mm",
      bottom: "0mm",
      left: "0mm",
    },
    printBackground: true,
    preferCSSPageSize: true,
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
      const blocks = getSectionBlocks(contentObj);

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

      const pushParagraphText = (text) => {
        if (!text.trim()) return;

        const isListStyle =
          sec.list_type === "bullet" || sec.list_type === "numbered";

        const baseOptions = {
          children: [
            new TextRun({
              text,
              size: sec.body_font_size * 2,
              color: "000000",
            }),
          ],
          alignment: getAlignment(sec.body_text_align),
          spacing: {
            before: 80,
            after: isListStyle ? 100 : 150,
            line: sec.line_height * 240,
          },
          indent: {
            left: indent,
          },
        };

        if (sec.list_type === "bullet") {
          children.push(new Paragraph({ ...baseOptions, bullet: { level: 0 } }));
          return;
        }

        if (sec.list_type === "numbered") {
          children.push(
            new Paragraph({
              ...baseOptions,
              numbering: {
                reference: "default-numbering",
                level: 0,
              },
            }),
          );
          return;
        }

        children.push(new Paragraph(baseOptions));
      };

      blocks.forEach((block) => {
        if (block.type === "image") {
          const imageRun = imageRunFromDataUrl(block.image.src);

          if (imageRun) {
            children.push(
              new Paragraph({
                children: [imageRun],
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 80 },
              }),
            );
          } else if (block.image.src) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: block.image.caption || block.image.src,
                    size: sec.body_font_size * 2,
                    color: "000000",
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 80 },
              }),
            );
          }

          if (block.image.caption) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: block.image.caption,
                    size: Math.max(18, (sec.body_font_size - 1) * 2),
                    italics: true,
                    color: "4B5563",
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 120 },
              }),
            );
          }

          return;
        }

        if (block.type === "table") {
          pushParagraphText("");
          return;
        }

        `${block.text || ""}`.split("\n").forEach(pushParagraphText);
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
