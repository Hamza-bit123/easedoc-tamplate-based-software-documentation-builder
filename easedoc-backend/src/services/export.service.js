import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  AlignmentType,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import {
  buildSectionNumbers,
  computeFigureLabels,
  computeTableLabels,
  formatExportedFigureCaption,
  formatExportedTableCaption,
} from "../utils/figureNumbering.js";

const parseJsonPayload = (value) => {
  if (!value || typeof value !== "string") return value || null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getTableColumnCount = (rows = []) =>
  rows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);

const normalizeTableData = (value) => {
  const parsed = parseJsonPayload(value) || {};
  const source = Array.isArray(parsed) ? { rows: parsed } : parsed;
  const sourceRows = Array.isArray(source.rows)
    ? source.rows
    : Array.isArray(source.cells)
      ? source.cells
      : [];
  const headers = Array.isArray(source.headers)
    ? source.headers
    : Array.isArray(source.columns)
      ? source.columns
      : [];
  const columnCount = Math.max(getTableColumnCount(sourceRows), headers.length, 1);
  const rowCount = Math.max(sourceRows.length, headers.length ? 1 : 0);

  return {
    caption: `${source.caption || ""}`,
    hasHeader: source.hasHeader !== false,
    rows: Array.from({ length: rowCount }, (_, rowIndex) => {
      const row = Array.isArray(sourceRows[rowIndex]) ? sourceRows[rowIndex] : [];

      return Array.from({ length: columnCount }, (_, columnIndex) => {
        const cell = row[columnIndex];
        if (cell !== undefined && cell !== null) return `${cell}`;
        if (rowIndex === 0 && headers[columnIndex]) return `${headers[columnIndex]}`;
        return "";
      });
    }),
  };
};

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
  const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER;

  const browser = await puppeteer.launch({
    args: isProduction ? chromium.args : [],
    defaultViewport: chromium.defaultViewport,
    executablePath: isProduction 
      ? await chromium.executablePath() 
      : "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    headless: isProduction ? chromium.headless : true,
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
    template.sections = buildSectionNumbers(template.sections);
    const figureLabels = computeFigureLabels(template, sectionsMap).labels;
    const tableLabels = computeTableLabels(template, sectionsMap).labels;

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

      const pushTable = (block, blockIndex) => {
        const table = normalizeTableData(block.tableData);
        const tableKey = `${sec.id}:${block.clientId || block.id || blockIndex}`;
        const tableLabel = tableLabels.get(tableKey) || "Table";
        const captionText = formatExportedTableCaption(
          tableLabel,
          table.caption || "",
        );

        if (captionText) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: captionText,
                  size: Math.max(18, (sec.body_font_size - 1) * 2),
                  bold: true,
                  color: "111827",
                }),
              ],
              alignment: AlignmentType.LEFT,
              spacing: { before: 160, after: 80 },
              indent: { left: indent },
            }),
          );
        }

        if (!table.rows.length) return;

        const columnCount = getTableColumnCount(table.rows) || 1;
        const border = {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "9CA3AF",
        };

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: border,
              bottom: border,
              left: border,
              right: border,
              insideHorizontal: border,
              insideVertical: border,
            },
            rows: table.rows.map(
              (row, rowIndex) =>
                new TableRow({
                  children: row.map((cell) => {
                    const isHeader = table.hasHeader && rowIndex === 0;

                    return new TableCell({
                      width: {
                        size: Math.floor(100 / columnCount),
                        type: WidthType.PERCENTAGE,
                      },
                      shading: isHeader ? { fill: "EEF2FF" } : undefined,
                      margins: {
                        top: 120,
                        bottom: 120,
                        left: 120,
                        right: 120,
                      },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: cell || " ",
                              size: sec.body_font_size * 2,
                              bold: isHeader,
                              color: "000000",
                            }),
                          ],
                          alignment: AlignmentType.LEFT,
                        }),
                      ],
                    });
                  }),
                }),
            ),
          }),
        );
      };

      blocks.forEach((block, blockIndex) => {
        if (block.type === "image") {
          const figureKey = `${sec.id}:${block.clientId || block.id || blockIndex}`;
          const figureLabel = figureLabels.get(figureKey) || "Figure";
          const captionText = formatExportedFigureCaption(
            figureLabel,
            block.image?.caption || "",
          );
          const imageRun = imageRunFromDataUrl(block.image?.src || "");

          if (imageRun) {
            children.push(
              new Paragraph({
                children: [imageRun],
                alignment: AlignmentType.CENTER,
                spacing: { before: 160, after: 100 },
              }),
            );
          }

          if (captionText || block.image?.src) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: captionText || figureLabel,
                    size: Math.max(18, (sec.body_font_size - 1) * 2),
                    italics: true,
                    color: "374151",
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: imageRun ? 60 : 160, after: 160 },
              }),
            );
          }

          return;
        }

        if (block.type === "table") {
          pushTable(block, blockIndex);
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
