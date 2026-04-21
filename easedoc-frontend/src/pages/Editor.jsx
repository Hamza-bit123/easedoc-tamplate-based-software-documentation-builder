import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import "./Editor.css";
import generatePrintHTML from "../utils/generatePrintHTML";

const Editor = () => {
  const { documentId } = useParams();

  const [template, setTemplate] = useState(null);
  const [sections, setSections] = useState({});
  const [errors, setErrors] = useState({});
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const PAGE_HEIGHT = 1122; // px (~A4)

  // ================= LOAD =================
  useEffect(() => {
    loadEditor();
  }, []);

  const loadEditor = async () => {
    try {
      const doc = await api.get(`/documents/${documentId}`);
      const temp = await api.get(`/templates/${doc.data.template_id}/full`);
      const sec = await api.get(`/document-sections/${documentId}`);

      let map = {};
      sec.data.forEach((s) => {
        map[s.template_section_id] = {
          title: s.custom_title || "",
          content: s.content || "",
        };
      });

      setTemplate(temp.data);
      setSections(map);
    } catch (err) {
      console.log(err);
      alert("Failed to load editor");
    }
  };

  const handleTitleChange = (id, value) => {
    setSections({
      ...sections,
      [id]: {
        ...sections[id],
        title: value,
      },
    });
  };

  const handleContentChange = (id, value) => {
    setSections({
      ...sections,
      [id]: {
        ...sections[id],
        content: value,
      },
    });
  };

  // ================= SAVE =================
  const saveAll = async () => {
    try {
      setSaving(true);

      for (let sec of template.sections) {
        await api.post("/document-sections/save", {
          document_id: documentId,
          template_section_id: sec.id,
          content: sections[sec.id]?.content || "",
          custom_title: sections[sec.id]?.title || sec.title,
        });
      }

      setSaving(false);
    } catch (err) {
      setSaving(false);
      console.log(err);
      alert("Save failed");
    }
  };

  // ================= CTRL + S FIX =================
  useEffect(() => {
    const handler = async (e) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        await saveAll();
      }
    };

    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [sections, template]);

  // ================= VALIDATION =================
  const validate = async () => {
    try {
      const res = await api.get(`/documents/${documentId}/validate`);

      let errMap = {};
      res.data.errors.forEach((e) => {
        errMap[e.section_id] = e.message;
      });

      setErrors(errMap);

      return Object.keys(errMap).length === 0;
    } catch {
      alert("Validation failed");
      return false;
    }
  };

  // ================= PREVIEW (FIXED) =================
  const handlePreview = async () => {
    await saveAll();

    const isValid = await validate();
    if (!isValid) return;

    const html = generatePrintHTML(template, sections);

    const previewWindow = window.open("", "_blank");

    previewWindow.document.open();
    previewWindow.document.write(html);
    previewWindow.document.close();

    previewWindow.focus();
    // previewWindow.print();
    // setTimeout(() => {
    //   previewWindow.print();
    // }, 500);
  };

  // ================= EXPORT FIX =================
  const handleExport = async () => {
    try {
      const res = await api.get(`/export/pdf/${documentId}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", "document.pdf");
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.log(err);
      alert("Export failed");
    }
  };

  const generateNumbering = (sections) => {
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

      return {
        ...sec,
        number,
      };
    });
  };
  const getSectionStyle = (sec) => {
    return {
      fontSize: `${sec.font_size || 14}px`,
      fontWeight: sec.font_weight || "normal",
      textAlign: sec.text_align || "left",
      lineHeight: sec.line_height || 1.5,
      marginTop: `${sec.margin_top || 10}px`,
      marginBottom: `${sec.margin_bottom || 10}px`,
      paddingLeft: `${sec.padding_left || 0}px`,
    };
  };
  const paginateSections = (sectionsList) => {
    const pages = [];
    let currentPage = [];
    let currentHeight = 0;

    sectionsList.forEach((sec) => {
      const estimatedHeight =
        120 + (sections[sec.id]?.content?.length || 0) * 0.5;

      if (currentHeight + estimatedHeight > PAGE_HEIGHT) {
        pages.push(currentPage);
        currentPage = [];
        currentHeight = 0;
      }

      currentPage.push(sec);
      currentHeight += estimatedHeight;
    });

    if (currentPage.length) {
      pages.push(currentPage);
    }

    return pages;
  };
  if (!template) return <p>Loading...</p>;

  const numberedSections = generateNumbering(template.sections);
  const pages = paginateSections(numberedSections);
  return (
    <div className="editor">
      {/* HEADER */}
      <div className="editor-header">
        <h1>{template.name}</h1>

        <div>
          <button onClick={saveAll}>{saving ? "Saving..." : "Save"}</button>

          <button onClick={handlePreview}>Preview</button>

          <button onClick={handleExport}>Export PDF</button>
        </div>
      </div>

      {/* EDIT MODE */}
      {!previewMode &&
        numberedSections?.map((sec) => (
          <div key={sec.id} className="section">
            <h2 className={`level-${sec.level}`}>{sec.number}</h2>

            {/* TITLE (editable) */}
            <input
              value={sections[sec.id]?.title || sec.title}
              onChange={(e) => handleTitleChange(sec.id, e.target.value)}
              className="editor-title"
            />

            {/* BODY */}
            <textarea
              placeholder="Type here..."
              value={sections[sec.id]?.content || ""}
              onChange={(e) => handleContentChange(sec.id, e.target.value)}
              className={`editor-input ${errors[sec.id] ? "error" : ""}`}
              rows={1}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
            />
          </div>
        ))}
    </div>
  );
};

export default Editor;
