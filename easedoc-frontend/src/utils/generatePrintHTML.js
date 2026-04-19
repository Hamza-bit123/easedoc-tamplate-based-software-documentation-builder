const generatePrintHTML = (template, sections) => {
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
  return `
  <html>
    <head>
      <title>${template.name}</title>

      <style>
        body {
          margin: 0;
          padding: 0;
          background: #ccc;
          font-family: ${template.default_font_family};
        }

        .page {
          width: 210mm;
          min-height: 297mm;
          margin: 20px auto;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.2);

          padding-top: ${template.page_margin_top}mm;
          padding-bottom: ${template.page_margin_bottom}mm;
          padding-left: ${template.page_margin_left}mm;
          padding-right: ${template.page_margin_right}mm;

          box-sizing: border-box;
        }

        h2 {
          margin-bottom: 5px;
        }

        p {
          margin: 0;
        }
      </style>
    </head>

    <body>

      <div class="page">

${addNumbering(template.sections)
  .map((sec) => {
    const title = sections[sec.id]?.title || sec.title;
    const content = sections[sec.id]?.content || "";

    return `
      <div style="
        margin-top:${sec.margin_top}px;
        margin-bottom:${sec.margin_bottom}px;
        padding-left:${sec.padding_left}px;
      ">

        <h2 style="
          font-size:${sec.title_font_size}px;
          font-weight:${sec.title_font_weight};
          text-align:${sec.title_text_align};
        ">
          ${sec.number || ""} ${title}
        </h2>

        <div style="
          font-size:${sec.body_font_size}px;
          font-weight:${sec.body_font_weight};
          text-align:${sec.body_text_align};
          line-height:${sec.line_height};
        ">
          ${
            sec.list_type === "bullet"
              ? `<ul>${content
                  .split("\n")
                  .map((l) => `<li>${l}</li>`)
                  .join("")}</ul>`
              : sec.list_type === "numbered"
                ? `<ol>${content
                    .split("\n")
                    .map((l) => `<li>${l}</li>`)
                    .join("")}</ol>`
                : `<p>${content}</p>`
          }
        </div>

      </div>
    `;
  })
  .join("")}
      </div>

    </body>
  </html>
  `;
};

export default generatePrintHTML;
