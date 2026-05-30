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
  PageNumber,
  NumberFormat,
  Footer,
  SectionType,
  convertMillimetersToTwip,
  convertInchesToTwip,
  UnderlineType,
  ShadingType,
} from "docx";
import {
  buildSectionNumbers,
  computeFigureLabels,
  computeTableLabels,
  formatExportedFigureCaption,
  formatExportedTableCaption,
} from "../utils/figureNumbering.js";

// ─── helpers ────────────────────────────────────────────────────────────────

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

const getImageDimensions = (buffer) => {
  // Check PNG
  if (
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }

  // Check GIF
  if (
    buffer.length >= 10 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    const width = buffer.readUInt16LE(6);
    const height = buffer.readUInt16LE(8);
    return { width, height };
  }

  // Check JPEG
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      while (offset < buffer.length && buffer[offset] === 0xff) {
        offset++;
      }
      if (offset >= buffer.length) break;
      const marker = buffer[offset];
      offset++;

      if (marker === 0xda || marker === 0xd9) break;

      if (offset + 2 > buffer.length) break;
      const length = buffer.readUInt16BE(offset);
      
      const isSOF = (marker >= 0xc0 && marker <= 0xc3) || 
                    (marker >= 0xc5 && marker <= 0xc7) || 
                    (marker >= 0xc9 && marker <= 0xcb) || 
                    (marker >= 0xcd && marker <= 0xcf);

      if (isSOF) {
        if (offset + 6 <= buffer.length) {
          const height = buffer.readUInt16BE(offset + 3);
          const width = buffer.readUInt16BE(offset + 5);
          return { width, height };
        }
        break;
      }
      offset += length;
    }
  }
  return null;
};

const imageRunFromDataUrl = (src) => {
  const match = `${src}`.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;

  const imageType = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  const supportedTypes = new Set(["png", "jpg", "gif", "bmp"]);
  if (!supportedTypes.has(imageType)) return null;

  const buffer = Buffer.from(match[2], "base64");
  
  // Calculate scaled dimensions to preserve aspect ratio (fitting in 500x280 box)
  const maxW = 500;
  const maxH = 280;
  let width = 440;
  let height = 260;

  const dimensions = getImageDimensions(buffer);
  if (dimensions && dimensions.width && dimensions.height) {
    const ratio = dimensions.width / dimensions.height;
    if (dimensions.width > maxW || dimensions.height > maxH) {
      if (ratio > maxW / maxH) {
        width = maxW;
        height = Math.round(maxW / ratio);
      } else {
        height = maxH;
        width = Math.round(maxH * ratio);
      }
    } else {
      width = dimensions.width;
      height = dimensions.height;
    }
  }

  return new ImageRun({
    type: imageType,
    data: buffer,
    transformation: {
      width,
      height,
    },
  });
};

/** Map CSS font-family name → docx font name (best effort) */
const normalizeFontName = (fontFamily = "") => {
  const f = fontFamily.trim().replace(/['"]/g, "");
  const map = {
    "times new roman": "Times New Roman",
    "times": "Times New Roman",
    "arial": "Arial",
    "helvetica": "Arial",
    "calibri": "Calibri",
    "georgia": "Georgia",
    "verdana": "Verdana",
    "courier new": "Courier New",
    "courier": "Courier New",
    "tahoma": "Tahoma",
    "trebuchet ms": "Trebuchet MS",
    "comic sans ms": "Comic Sans MS",
  };
  return map[f.toLowerCase()] || f || "Times New Roman";
};

/** Convert CSS text-align → docx AlignmentType */
const getAlignment = (align) => {
  switch ((align || "").toLowerCase()) {
    case "center":   return AlignmentType.CENTER;
    case "right":    return AlignmentType.RIGHT;
    case "justify":  return AlignmentType.JUSTIFIED;
    default:         return AlignmentType.LEFT;
  }
};

// ─── PDF export ─────────────────────────────────────────────────────────────

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
    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
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

// ─── Word export ─────────────────────────────────────────────────────────────

export const exportWordService = async (template, sectionsMap, res) => {
  try {
    template.sections = buildSectionNumbers(template.sections);
    const figureLabels = computeFigureLabels(template, sectionsMap).labels;
    const tableLabels  = computeTableLabels(template, sectionsMap).labels;

    // ── Resolve global template settings ──────────────────────────────────
    const fontName       = normalizeFontName(template.default_font_family || "Times New Roman");
    const lineHeightMult = parseFloat(template.default_line_height) || 1.5;

    // Page margins: template stores mm values
    const marginTopTwip    = convertMillimetersToTwip(parseFloat(template.page_margin_top)    || 20);
    const marginBottomTwip = convertMillimetersToTwip(parseFloat(template.page_margin_bottom) || 20);
    const marginLeftTwip   = convertMillimetersToTwip(parseFloat(template.page_margin_left)   || 20);
    const marginRightTwip  = convertMillimetersToTwip(parseFloat(template.page_margin_right)  || 20);
    // Footer sits inside the bottom margin area — give it 10 mm
    const footerDistTwip   = convertMillimetersToTwip(10);

    const children = [];
    let listInstanceCounter = 1;

    // ── Build section content ─────────────────────────────────────────────
    template.sections.forEach((sec) => {
      const contentObj = sectionsMap[sec.id];
      const title  = contentObj?.title || sec.title;
      const blocks = getSectionBlocks(contentObj);

      // Indent = section padding_left (px→twip) + level indent
      const indentTwip = Math.round(((parseFloat(sec.padding_left) || 0) + (sec.level - 1) * 20) * 15);

      // Title font size (px → half-points: multiply by 2)
      const titleHalfPt = Math.round((sec.title_font_size || 16) * 2);
      const titleBold   = (sec.title_font_weight || "bold") === "bold";

      // Spacing (px → twip: 1 px ≈ 15 twip at 96 dpi)
      const spacingBefore = Math.round((sec.margin_top    || 10) * 15);
      const spacingAfter  = Math.round((sec.margin_bottom || 10) * 15);

      const headingLevels = [
        HeadingLevel.HEADING_1,
        HeadingLevel.HEADING_2,
        HeadingLevel.HEADING_3,
        HeadingLevel.HEADING_4,
        HeadingLevel.HEADING_5,
        HeadingLevel.HEADING_6,
      ];
      const headingLvl = headingLevels[Math.min(Math.max(sec.level || 1, 1), 6) - 1];

      // Title paragraph
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${sec.number}. ${title}`,
              size: titleHalfPt,
              bold: titleBold,
              font: fontName,
              color: "000000",
            }),
          ],
          heading: headingLvl,
          alignment: getAlignment(sec.title_text_align),
          spacing: { before: spacingBefore, after: spacingAfter },
          indent: { left: indentTwip },
        }),
      );

      // Body font settings
      const bodyHalfPt    = Math.round((sec.body_font_size   || 12) * 2);
      const bodyBold      = (sec.body_font_weight || "normal") === "bold";
      const secLineHeight = parseFloat(sec.line_height) || lineHeightMult;
      // docx line spacing: 240 = single. Multiply by 240.
      const lineSpacing   = Math.round(secLineHeight * 240);

      // Unique numbering instance for this section to restart list numbering at 1
      const currentListInstance = listInstanceCounter++;

      // ── Paragraph text helper ──────────────────────────────────────────
      const pushParagraphText = (text) => {
        if (!text.trim()) return;

        const isListStyle = sec.list_type === "bullet" || sec.list_type === "numbered";

        const baseOptions = {
          children: [
            new TextRun({
              text,
              size:  bodyHalfPt,
              bold:  bodyBold,
              font:  fontName,
              color: "000000",
            }),
          ],
          alignment: getAlignment(sec.body_text_align),
          spacing: {
            before: 0,
            after:  isListStyle ? 75 : 150, // 5px for lists, 10px for paragraphs (converted to twips)
            line:   lineSpacing,
            lineRule: "auto",
          },
          indent: isListStyle
            ? { left: indentTwip + 300, hanging: 300 } // Align bullets/numbers nicely with 20px padding (300 twips)
            : { left: indentTwip },
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
                instance: currentListInstance,
              },
            }),
          );
          return;
        }

        children.push(new Paragraph(baseOptions));
      };

      // ── Table helper ───────────────────────────────────────────────────
      const pushTable = (block, blockIndex) => {
        const table    = normalizeTableData(block.tableData);
        const tableKey = `${sec.id}:${block.clientId || block.id || blockIndex}`;
        const tableLabel   = tableLabels.get(tableKey) || "Table";
        const captionText  = formatExportedTableCaption(tableLabel, table.caption || "");

        if (captionText) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: captionText,
                  size: Math.max(18, (sec.body_font_size - 1) * 2),
                  bold: true,
                  font: fontName,
                  color: "111827",
                }),
              ],
              alignment: AlignmentType.LEFT,
              spacing: { before: 210, after: 90 }, // matches table wrapper padding/margins
              indent: { left: indentTwip },
            }),
          );
        }

        if (!table.rows.length) return;

        const columnCount = getTableColumnCount(table.rows) || 1;
        const border = { style: BorderStyle.SINGLE, size: 4, color: "9CA3AF" };

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            indent: { size: indentTwip, type: WidthType.DXA },
            borders: {
              top: border, bottom: border,
              left: border, right: border,
              insideHorizontal: border, insideVertical: border,
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
                      shading: isHeader
                        ? { type: ShadingType.SOLID, fill: "EEF2FF", color: "auto" }
                        : undefined,
                      margins: { top: 90, bottom: 90, left: 120, right: 120 }, // 6px top/bottom, 8px left/right
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: cell || " ",
                              size: bodyHalfPt,
                              bold: isHeader ? true : bodyBold,
                              font: fontName,
                              color: "000000",
                            }),
                          ],
                          alignment: AlignmentType.LEFT,
                          spacing: { line: lineSpacing, lineRule: "auto" },
                        }),
                      ],
                    });
                  }),
                }),
            ),
          }),
        );

        // Spacing after table (margin-bottom: 18px = 270 twips)
        children.push(new Paragraph({ children: [], spacing: { before: 0, after: 270 } }));
      };

      // ── Render blocks ──────────────────────────────────────────────────
      blocks.forEach((block, blockIndex) => {
        if (block.type === "image") {
          const figureKey   = `${sec.id}:${block.clientId || block.id || blockIndex}`;
          const figureLabel = figureLabels.get(figureKey) || "Figure";
          const captionText = formatExportedFigureCaption(figureLabel, block.image?.caption || "");
          const imageRun    = imageRunFromDataUrl(block.image?.src || "");

          if (imageRun) {
            children.push(
              new Paragraph({
                children: [imageRun],
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 120 }, // 16px before, 8px after
                indent: { left: indentTwip },
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
                    font: fontName,
                    color: "374151",
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: imageRun ? 120 : 240, after: 300 }, // 8px before if image exists, 20px after
                indent: { left: indentTwip },
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

    // ── Page-number footer (matches PDF preview "Page X of Y") ───────────
    const pageNumberFooter = new Footer({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
              size: 20,          // 10 pt
              color: "666666",
              font: fontName,
            }),
          ],
          alignment: AlignmentType.RIGHT,
        }),
      ],
    });

    // ── Assemble Document with all formatting rules enforced ──────────────
    const doc = new Document({
      // Default font for the whole document using standard defaults
      styles: {
        documentDefaults: {
          run: {
            font: fontName,
            size: 24, // 12pt
            color: "000000",
          },
        },
        paragraphStyles: [
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { font: fontName, color: "000000" },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { font: fontName, color: "000000" },
          },
          {
            id: "Heading3",
            name: "Heading 3",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { font: fontName, color: "000000" },
          },
          {
            id: "Heading4",
            name: "Heading 4",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { font: fontName, color: "000000" },
          },
          {
            id: "Heading5",
            name: "Heading 5",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { font: fontName, color: "000000" },
          },
          {
            id: "Heading6",
            name: "Heading 6",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { font: fontName, color: "000000" },
          },
        ],
      },

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
          properties: {
            type: SectionType.CONTINUOUS,
            page: {
              size: {
                // A4 in twip: 210 mm × 297 mm
                width:  convertMillimetersToTwip(210),
                height: convertMillimetersToTwip(297),
              },
              margin: {
                top:    marginTopTwip,
                bottom: marginBottomTwip,
                left:   marginLeftTwip,
                right:  marginRightTwip,
                footer: footerDistTwip,
              },
              pageNumbers: {
                start: 1,
                formatType: NumberFormat.DECIMAL,
              },
            },
          },
          footers: {
            default: pageNumberFooter,
          },
          children,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": "attachment; filename=document.docx",
    });

    res.send(buffer);
  } catch (err) {
    console.error("[Word Export Error]", err);
    res.status(500).send("Word export failed: " + err.message);
  }
};
