const generatePrintHTML = (template, sections, isPDF = false) => {
  const styles = isPDF
    ? `
    body {
      margin: 0;
      padding: 0;
      background: white;
      font-family: ${template.default_font_family};
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
      font-family: ${template.default_font_family};
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

  const PAGE_HEIGHT = 1122; // A4 height in px at 96dpi

  const paddingTop = template.page_margin_top * 3.78;
  const paddingBottom = template.page_margin_bottom * 3.78;
  const paddingLeft = template.page_margin_left * 3.78;
  const paddingRight = template.page_margin_right * 3.78;

  // Use a consistent content height, leaving a bit of buffer for the footer
  const CONTENT_HEIGHT = PAGE_HEIGHT - 15; 

  const addNumbering = (sections) => {
    const counters = {};

    return sections.map((sec) => {
      const level = sec.level || 1;

      if (!counters[level]) counters[level] = 0;
      counters[level]++;

      // reset deeper levels
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

  const numberedSections = addNumbering(template.sections);

  // ===== CREATE MEASURE =====
  const measure = document.createElement("div");
  measure.style.position = "absolute";
  measure.style.visibility = "hidden";
  measure.style.width = "794px"; // A4 width
  measure.style.boxSizing = "border-box";
  measure.style.fontFamily = template.default_font_family;
  // measure.style.height = `${CONTENT_HEIGHT}px`; // Don't fix height for measurement
  measure.style.padding = `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`;
  measure.style.overflow = "hidden";

  document.body.appendChild(measure);

  const getHeight = (html) => {
    measure.innerHTML = html;
    return measure.scrollHeight;
  };

  // ===== HELPERS =====
  const getTitleHTML = (sec, title) => {
    return `
      <h2 style="
        font-size:${sec.title_font_size}px;
        font-weight:${sec.title_font_weight};
        text-align:${sec.title_text_align};
        padding-left:${sec.padding_left + (sec.level - 1) * 20}px;
        margin-top:${sec.margin_top}px;
        margin-bottom:${sec.margin_bottom}px;
        line-height: 1.2;
      ">
        ${sec.number}. ${title}
      </h2>
    `;
  };

  const getParaHTML = (sec, text) => {
    const indent = sec.padding_left + (sec.level - 1) * 20;

    // 👉 LIST ITEM
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
        ${text}
      </li>
    `;
    }

    // 👉 NORMAL PARAGRAPH
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
      ${text}
    </p>
  `;
  };
  // ===== PAGINATION =====
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

  // ===== LOOP =====
  numberedSections.forEach((sec) => {
    const contentObj = sections[sec.id];

    const title = contentObj?.title || sec.title;
    const content = contentObj?.content || "";

    const titleHTML = getTitleHTML(sec, title);

    if (getHeight(currentHTML + titleHTML) > CONTENT_HEIGHT) {
      pushPage();
    }

    currentHTML += titleHTML;

    const paragraphs = content.split("\n");

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

    paragraphs.forEach((p) => {
      if (!p.trim()) return;

      const isList = sec.list_type === "bullet" || sec.list_type === "numbered";

      // 👉 LIST ITEM
      if (isList) {
        if (currentListType && currentListType !== sec.list_type) {
          flushList();
        }

        currentListType = sec.list_type;

        const liHTML = getParaHTML(sec, p);
        // 🔥 CHECK overflow BEFORE adding

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
      }

      // 👉 NORMAL PARAGRAPH
      else {
        flushList();

        let remaining = p;

        while (remaining.length > 0) {
          const paraHTML = getParaHTML(sec, remaining);

          if (getHeight(currentHTML + paraHTML) <= CONTENT_HEIGHT) {
            currentHTML += paraHTML;
            remaining = "";
          } else {
            const { fit, rest } = splitText(sec, remaining);

            if (!fit) {
              // If not even one word fits, we must push page and try again
              pushPage();
              // To avoid infinite loop if a single word is too long (rare but possible)
              if (getHeight(getParaHTML(sec, remaining.split(" ")[0])) > CONTENT_HEIGHT) {
                  // Extremely long word, just force it
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
      }
    });

    // flush at end
    flushList();
  });

  if (currentHTML.trim()) pushPage();

  document.body.removeChild(measure);

  // ===== FINAL HTML =====
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    @page {
      size: A4;
      margin: 0;
    }

    ${styles}
    @media print {
      body { background: white; }
      .page { margin: 0; box-shadow: none; page-break-after: always; break-after: page; }
    }
  </style>
</head>
<body>
  ${pages.map((p, i) => `
    <div class="page">
      ${p}
      <div class="page-number">Page ${i + 1} of ${pages.length}</div>
    </div>`).join("")}
</body>
</html>`;
};

export default generatePrintHTML;
