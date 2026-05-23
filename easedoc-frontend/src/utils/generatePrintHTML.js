import {
  buildSectionNumbers,
  computeFigureLabels,
  formatExportedFigureCaption,
} from "./figureNumbering";

const escapeHTML = (value) =>
  `${value ?? ""}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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

const generatePrintHTML = (template, sections, isPDF = false) => {
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
        return;
      }

      `${block.text || ""}`.split("\n").forEach(renderParagraphText);
    });

    flushList();
  });

  if (currentHTML.trim()) pushPage();

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
    ${styles}
    @media print {
      body { background: white; }
      .page { margin: 0; box-shadow: none; page-break-after: always; break-after: page; }
    }
  </style>
</head>
<body>
  ${pages
    .map(
      (p, i) => `
    <div class="page">
      ${p}
      <div class="page-number">Page ${i + 1} of ${pages.length}</div>
    </div>`,
    )
    .join("")}
</body>
</html>`;
};

export default generatePrintHTML;
