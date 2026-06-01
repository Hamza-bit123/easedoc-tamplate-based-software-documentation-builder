import {
  buildSectionNumbers,
  computeFigureLabels,
  computeTableLabels,
  formatExportedFigureCaption,
  formatExportedTableCaption,
} from "./figureNumbering";

const escapeHTML = (value) =>
  `${value ?? ""}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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

const generatePrintHTML = (template, sections, isPDF = false, tocLevel = 0) => {
  const styles = isPDF
    ? `
    body {
      margin: 0;
      padding: 0;
      background: white;
      font-family: ${escapeHTML(template.default_font_family)};
    }

    .page {
      width: 210mm;
      height: 297mm;
      margin: 0;
      box-sizing: border-box;
      position: relative;

      padding-top: ${template.page_margin_top}mm;
      padding-bottom: ${template.page_margin_bottom}mm;
      padding-left: ${template.page_margin_left}mm;
      padding-right: ${template.page_margin_right}mm;

      background: white;
      overflow: hidden;

      page-break-after: always;
      break-after: page;
    }
    .page-number {
      position: absolute;
      bottom: 10mm;
      right: 15mm;
      font-size: 10pt;
      color: #666;
    }
  `
    : `
    body {
      margin: 0;
      background: #ccc;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-family: ${escapeHTML(template.default_font_family)};
    }

    .page {
      width: 210mm;
      height: 297mm;
      background: white;
      color: black;
      margin: 20px 0;
      box-shadow: 0 0 10px rgba(0,0,0,0.2);
      box-sizing: border-box;
      position: relative;

      padding-top: ${template.page_margin_top}mm;
      padding-bottom: ${template.page_margin_bottom}mm;
      padding-left: ${template.page_margin_left}mm;
      padding-right: ${template.page_margin_right}mm;

      overflow: hidden;
    }
    .page-number {
      position: absolute;
      bottom: 10mm;
      right: 15mm;
      font-size: 10pt;
      color: #666;
    }
  `;

  const PAGE_HEIGHT = 1122;
  const paddingTop = template.page_margin_top * 3.78;
  const paddingBottom = template.page_margin_bottom * 3.78;
  const paddingLeft = template.page_margin_left * 3.78;
  const paddingRight = template.page_margin_right * 3.78;
  const CONTENT_HEIGHT = PAGE_HEIGHT - 15;

  const numberedSections = buildSectionNumbers(template.sections);
  const figureLabels = computeFigureLabels(template, sections).labels;
  const tableLabels = computeTableLabels(template, sections).labels;
  const measure = document.createElement("div");
  measure.style.position = "absolute";
  measure.style.visibility = "hidden";
  measure.style.width = "794px";
  measure.style.boxSizing = "border-box";
  measure.style.fontFamily = template.default_font_family;
  measure.style.padding = `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`;
  measure.style.overflow = "hidden";

  document.body.appendChild(measure);

  const getHeight = (html) => {
    measure.innerHTML = html;
    return measure.scrollHeight;
  };

  const getTitleHTML = (sec, title) => `
    <h2 style="
      font-size:${sec.title_font_size}px;
      font-weight:${sec.title_font_weight};
      text-align:${sec.title_text_align};
      padding-left:${sec.padding_left + (sec.level - 1) * 20}px;
      margin-top:${sec.margin_top}px;
      margin-bottom:${sec.margin_bottom}px;
      line-height: 1.2;
    ">
      ${sec.number}. ${escapeHTML(title)}
    </h2>
  `;

  const getParaHTML = (sec, text) => {
    const indent = sec.padding_left + (sec.level - 1) * 20;

    if (sec.list_type === "bullet" || sec.list_type === "numbered") {
      return `
        <li style="
          font-size:${sec.body_font_size}px;
          font-weight:${sec.body_font_weight};
          text-align:${sec.body_text_align};
          line-height:${sec.line_height};
          margin-left:${indent}px;
          margin-bottom: 5px;
        ">
          ${escapeHTML(text)}
        </li>
      `;
    }

    return `
      <p style="
        font-size:${sec.body_font_size}px;
        font-weight:${sec.body_font_weight};
        text-align:${sec.body_text_align};
        line-height:${sec.line_height};
        padding-left:${indent}px;
        margin-top: 0;
        margin-bottom:10px;
      ">
        ${escapeHTML(text)}
      </p>
    `;
  };

  const getImageHTML = (sec, block, blockIndex) => {
    const indent = sec.padding_left + (sec.level - 1) * 20;
    const src = block.image?.src || "";
    const userCaption = block.image?.caption || "";
    const figureKey = `${sec.id}:${block.clientId || block.id || blockIndex}`;
    const figureLabel = figureLabels.get(figureKey) || "Figure";
    const caption = formatExportedFigureCaption(figureLabel, userCaption);

    if (!src && !userCaption) {
      return "";
    }

    return `
      <figure class="document-figure" style="
        padding-left:${indent}px;
        margin: 16px 0 20px 0;
        text-align:center;
        max-width:100%;
        box-sizing:border-box;
      ">
        ${
          src
            ? `<img src="${escapeHTML(src)}" alt="${escapeHTML(block.image?.alt || figureLabel)}" style="
                display:block;
                width:100%;
                max-width:100%;
                max-height:280px;
                height:auto;
                object-fit:contain;
                margin:0 auto;
              " />`
            : ""
        }
        <figcaption style="
          font-size:${Math.max(10, sec.body_font_size - 1)}px;
          color:#374151;
          margin-top:8px;
          line-height:1.45;
          text-align:center;
          font-style:italic;
          word-break:break-word;
        ">${escapeHTML(caption)}</figcaption>
      </figure>
    `;
  };

  const getTableHTML = (sec, block, blockIndex) => {
    const indent = sec.padding_left + (sec.level - 1) * 20;
    const table = normalizeTableData(block.tableData);
    const rows = table.rows;
    const tableKey = `${sec.id}:${block.clientId || block.id || blockIndex}`;
    const tableLabel = tableLabels.get(tableKey) || "Table";
    const caption = formatExportedTableCaption(tableLabel, table.caption || "");

    if (!rows.length) {
      return caption
        ? `<p style="
            font-size:${Math.max(10, sec.body_font_size - 1)}px;
            padding-left:${indent}px;
            margin: 12px 0 8px 0;
            font-weight:700;
          ">${escapeHTML(caption)}</p>`
        : "";
    }

    const tableRows = rows
      .map((row, rowIndex) => {
        const isHeader = table.hasHeader && rowIndex === 0;
        const tag = isHeader ? "th" : "td";

        return `
          <tr>
            ${row
              .map(
                (cell) => `
                  <${tag} style="
                    border:1px solid #9ca3af;
                    padding:6px 8px;
                    font-size:${sec.body_font_size}px;
                    line-height:${sec.line_height};
                    text-align:left;
                    vertical-align:top;
                    background:${isHeader ? "#eef2ff" : "#ffffff"};
                    font-weight:${isHeader ? "700" : sec.body_font_weight};
                    word-break:break-word;
                  ">${escapeHTML(cell)}</${tag}>
                `,
              )
              .join("")}
          </tr>
        `;
      })
      .join("");

    return `
      <figure class="document-table" style="
        padding-left:${indent}px;
        margin: 14px 0 18px 0;
        max-width:100%;
        box-sizing:border-box;
      ">
        <figcaption style="
          font-size:${Math.max(10, sec.body_font_size - 1)}px;
          color:#111827;
          margin-bottom:6px;
          line-height:1.45;
          text-align:left;
          font-weight:700;
          word-break:break-word;
        ">${escapeHTML(caption)}</figcaption>
        <table style="
          width:100%;
          border-collapse:collapse;
          table-layout:fixed;
        ">
          <tbody>${tableRows}</tbody>
        </table>
      </figure>
    `;
  };

  const pages = [];
  let currentHTML = "";

  const pushPage = () => {
    if (currentHTML.trim()) {
      pages.push(currentHTML);
    }
    currentHTML = "";
  };

  const splitText = (sec, text) => {
    const words = text.split(" ");
    let fit = "";

    for (let i = 0; i < words.length; i++) {
      const test = fit + (fit ? " " : "") + words[i];
      const html = currentHTML + getParaHTML(sec, test);

      if (getHeight(html) > CONTENT_HEIGHT) break;

      fit = test;
    }

    return {
      fit: fit.trim(),
      rest: text.slice(fit.length).trim(),
    };
  };

  numberedSections.forEach((sec) => {
    const contentObj = sections[sec.id];
    const title = contentObj?.title || sec.title;
    const blocks = getSectionBlocks(contentObj);
    const titleHTML = getTitleHTML(sec, title);

    if (getHeight(currentHTML + titleHTML) > CONTENT_HEIGHT) {
      pushPage();
    }

    currentHTML += titleHTML;

    let listBuffer = [];
    let currentListType = null;
    let listCounter = 1;
    let listStart = 1;

    const flushList = () => {
      if (listBuffer.length === 0) return;

      const tag = currentListType === "numbered" ? "ol" : "ul";
      const startAttr =
        currentListType === "numbered" ? `start="${listStart}"` : "";
      const listHTML = `
        <${tag} ${startAttr} style="margin:0 0 10px 0; padding-left:20px;">
          ${listBuffer.join("")}
        </${tag}>
      `;

      if (getHeight(currentHTML + listHTML) > CONTENT_HEIGHT) {
        pushPage();
      }

      currentHTML += listHTML;
      listBuffer = [];
      currentListType = null;
    };

    const renderParagraphText = (text) => {
      if (!text.trim()) return;

      const isList = sec.list_type === "bullet" || sec.list_type === "numbered";

      if (isList) {
        if (currentListType && currentListType !== sec.list_type) {
          flushList();
        }

        currentListType = sec.list_type;
        const liHTML = getParaHTML(sec, text);
        const testTag = sec.list_type === "numbered" ? "ol" : "ul";

        if (
          getHeight(
            currentHTML +
              `<${testTag}>${listBuffer.join("") + liHTML}</${testTag}>`,
          ) > CONTENT_HEIGHT
        ) {
          flushList();
          listStart = listCounter;
          pushPage();
        }

        listBuffer.push(liHTML);
        if (sec.list_type === "numbered") {
          listCounter++;
        }
        return;
      }

      flushList();

      let remaining = text;
      while (remaining.length > 0) {
        const paraHTML = getParaHTML(sec, remaining);

        if (getHeight(currentHTML + paraHTML) <= CONTENT_HEIGHT) {
          currentHTML += paraHTML;
          remaining = "";
        } else {
          const { fit, rest } = splitText(sec, remaining);

          if (!fit) {
            pushPage();
            if (
              getHeight(getParaHTML(sec, remaining.split(" ")[0])) >
              CONTENT_HEIGHT
            ) {
              currentHTML += getParaHTML(sec, remaining);
              remaining = "";
            }
            continue;
          }

          currentHTML += getParaHTML(sec, fit);
          remaining = rest;
          pushPage();
        }
      }
    };

    blocks.forEach((block, blockIndex) => {
      if (block.type === "image") {
        flushList();
        const imageHTML = getImageHTML(sec, block, blockIndex);

        if (!imageHTML) return;

        if (getHeight(currentHTML + imageHTML) > CONTENT_HEIGHT) {
          pushPage();
        }

        currentHTML += imageHTML;
        return;
      }

      if (block.type === "table") {
        flushList();
        const tableHTML = getTableHTML(sec, block, blockIndex);

        if (!tableHTML) return;

        if (getHeight(currentHTML + tableHTML) > CONTENT_HEIGHT) {
          pushPage();
        }

        currentHTML += tableHTML;
        return;
      }

      `${block.text || ""}`.split("\n").forEach(renderParagraphText);
    });

    flushList();
  });

  if (currentHTML.trim()) pushPage();

  // ── Table of Contents generation ──────────────────────────────────────────
  let tocPages = [];
  if (tocLevel >= 2 && numberedSections.length > 0) {
    // Build a map of sectionId → page index (1-based) from the content pages
    const sectionPageMap = new Map();
    numberedSections.forEach((sec) => {
      const contentObj = sections[sec.id];
      const title = contentObj?.title || sec.title;
      const titleHTML = getTitleHTML(sec, title);

      // Walk through content pages to find which page contains each section title
      let cumulativeHTML = "";
      for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        const pageContent = pages[pageIdx];
        if (pageContent.includes(escapeHTML(title)) && pageContent.includes(`${sec.number}.`)) {
          sectionPageMap.set(sec.id, pageIdx + 1);
          break;
        }
      }
      // Fallback: if not found in scan, assign page 1
      if (!sectionPageMap.has(sec.id)) {
        sectionPageMap.set(sec.id, 1);
      }
    });

    // Filter sections by tocLevel
    const tocEntries = numberedSections.filter((sec) => (sec.level || 1) <= tocLevel);

    // Build ToC HTML
    const tocItemsHTML = tocEntries.map((sec) => {
      const contentObj = sections[sec.id];
      const title = contentObj?.title || sec.title;
      const level = sec.level || 1;
      const indent = (level - 1) * 24;
      const fontSize = level === 1 ? 13 : 11;
      const fontWeight = level === 1 ? "700" : "400";
      // Page number will be offset after we know how many ToC pages there are
      const pageNum = sectionPageMap.get(sec.id) || 1;

      return `
        <div class="toc-entry" data-section-id="${sec.id}" style="
          display: flex;
          align-items: baseline;
          margin-left: ${indent}px;
          margin-bottom: ${level === 1 ? 8 : 4}px;
          font-size: ${fontSize}px;
          font-weight: ${fontWeight};
          line-height: 1.8;
          color: #1a1a1a;
        ">
          <span class="toc-number" style="flex-shrink:0; margin-right:6px;">${escapeHTML(sec.number)}</span>
          <span class="toc-title" style="flex-shrink:0; margin-right:4px;">${escapeHTML(title)}</span>
          <span class="toc-dots" style="flex:1; border-bottom:1px dotted #999; margin: 0 4px; min-width:20px; position:relative; top:-3px;"></span>
          <span class="toc-page" data-page-offset="${pageNum}" style="flex-shrink:0; text-align:right; min-width:24px;">${pageNum}</span>
        </div>
      `;
    }).join("");

    // Measure how many pages the ToC occupies
    const tocTitleHTML = `
      <h1 style="
        font-size: 20px;
        font-weight: 700;
        text-align: center;
        margin-bottom: 28px;
        margin-top: 10px;
        color: #111;
        letter-spacing: 0.5px;
      ">Table of Contents</h1>
    `;
    const fullTocContent = tocTitleHTML + tocItemsHTML;

    // Paginate the ToC content
    let tocCurrentHTML = "";
    const tocContentParts = [tocTitleHTML, ...tocEntries.map((sec, i) => {
      const contentObj = sections[sec.id];
      const title = contentObj?.title || sec.title;
      const level = sec.level || 1;
      const indent = (level - 1) * 24;
      const fontSize = level === 1 ? 13 : 11;
      const fontWeight = level === 1 ? "700" : "400";
      const pageNum = sectionPageMap.get(sec.id) || 1;

      return `
        <div class="toc-entry" style="
          display: flex;
          align-items: baseline;
          margin-left: ${indent}px;
          margin-bottom: ${level === 1 ? 8 : 4}px;
          font-size: ${fontSize}px;
          font-weight: ${fontWeight};
          line-height: 1.8;
          color: #1a1a1a;
        ">
          <span class="toc-number" style="flex-shrink:0; margin-right:6px;">${escapeHTML(sec.number)}</span>
          <span class="toc-title" style="flex-shrink:0; margin-right:4px;">${escapeHTML(title)}</span>
          <span class="toc-dots" style="flex:1; border-bottom:1px dotted #999; margin: 0 4px; min-width:20px; position:relative; top:-3px;"></span>
          <span class="toc-page" style="flex-shrink:0; text-align:right; min-width:24px;">${pageNum}</span>
        </div>
      `;
    })];

    tocCurrentHTML = "";
    for (const part of tocContentParts) {
      const test = tocCurrentHTML + part;
      if (getHeight(test) > CONTENT_HEIGHT && tocCurrentHTML.trim()) {
        tocPages.push(tocCurrentHTML);
        tocCurrentHTML = part;
      } else {
        tocCurrentHTML = test;
      }
    }
    if (tocCurrentHTML.trim()) {
      tocPages.push(tocCurrentHTML);
    }

    // Now offset all page numbers in ToC entries by the number of ToC pages
    const tocPageCount = tocPages.length;
    tocPages = tocPages.map((pageHTML) => {
      return pageHTML.replace(
        /(<span class="toc-page"[^>]*>)(\d+)(<\/span>)/g,
        (match, before, num, after) => {
          return before + (parseInt(num, 10) + tocPageCount) + after;
        }
      );
    });
  }

  const totalPageCount = tocPages.length + pages.length;

  document.body.removeChild(measure);

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    @page {
      size: A4;
      margin: 0;
    }

    .document-figure {
      max-width: 100%;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .document-figure img {
      max-width: 100%;
      height: auto;
    }
    .document-table {
      max-width: 100%;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .document-table table {
      max-width: 100%;
    }
    ${styles}
    @media print {
      body { background: white; }
      .page { margin: 0; box-shadow: none; page-break-after: always; break-after: page; }
    }
  </style>
</head>
<body>
  ${tocPages
    .map(
      (p, i) => `
    <div class="page">
      ${p}
      <div class="page-number">Page ${i + 1} of ${totalPageCount}</div>
    </div>`,
    )
    .join("")}
  ${pages
    .map(
      (p, i) => `
    <div class="page">
      ${p}
      <div class="page-number">Page ${tocPages.length + i + 1} of ${totalPageCount}</div>
    </div>`,
    )
    .join("")}
</body>
</html>`;
};

export default generatePrintHTML;
