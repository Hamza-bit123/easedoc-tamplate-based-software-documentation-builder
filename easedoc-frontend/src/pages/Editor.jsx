import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import "./Editor.css";
import generatePrintHTML from "../utils/generatePrintHTML";
import { FiSave, FiEye, FiDownload, FiFileText, FiX, FiChevronUp } from "react-icons/fi";
import { BiSolidFileDoc } from "react-icons/bi";
import toast from "react-hot-toast";

const Editor = () => {
  const { documentId } = useParams();

  const [template, setTemplate] = useState(null);
  const [sections, setSections] = useState({});
  const [errors, setErrors] = useState({});
  const [previewHTML, setPreviewHTML] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("draft");
  const [documentTitle, setDocumentTitle] = useState("");
  const [loadError, setLoadError] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const PAGE_HEIGHT = 1122; // px (~A4)

  // ================= LOAD =================
  useEffect(() => {
    loadEditor();
  }, []);

  // Auto-resize textareas on section change
  useEffect(() => {
    setTimeout(() => {
      document.querySelectorAll(".editor-input").forEach((textarea) => {
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
      });
    }, 0);
  }, [sections]);

  // Scroll-to-top visibility (listening to main container scroll)
  useEffect(() => {
    const scroller = document.querySelector(".main-container");
    if (!scroller) return;

    const onScroll = () => {
      setShowScrollTop(scroller.scrollTop > 400);
    };
    
    scroller.addEventListener("scroll", onScroll);
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    document.querySelector(".main-container")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadEditor = async () => {
    try {
      const doc = await api.get(`/documents/${documentId}`);

      if (!doc.data.template_version_id) {
        throw new Error("Document has no template version");
      }

      const endpoint = `/templates/${doc.data.template_id}/version/${doc.data.template_version_id}/full`;
        
      const temp = await api.get(endpoint);
      const sec = await api.get(`/document-sections/${documentId}`);

      let map = {};
      sec.data.forEach((s) => {
        map[s.template_section_version_id] = {
          title: s.custom_title || "",
          content: s.content || "",
        };
      });

      setTemplate(temp.data);
      setSections(map);
      setStatus(doc.data.status || "draft");
      setDocumentTitle(doc.data.title || "");
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to load editor";
      setLoadError(message);
      toast.error("Failed to load editor");
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

      const cleanDocumentTitle = documentTitle.trim();
      if (!cleanDocumentTitle) {
        toast.error("Document name is required.");
        setSaving(false);
        return;
      }

      await api.put(`/documents/${documentId}/title`, {
        title: cleanDocumentTitle,
      });
      setDocumentTitle(cleanDocumentTitle);

      for (let sec of template.sections) {
        await api.post("/document-sections/save", {
          document_id: documentId,
          template_section_version_id: sec.id,
          content: sections[sec.id]?.content || "",
          custom_title: sections[sec.id]?.title || sec.title,
        });
      }

      toast.success("All changes saved!");
      setSaving(false);
    } catch {
      setSaving(false);
      toast.error("Save failed");
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
    return () => window.removeEventListener("keydown", handler);
  }, [sections, template, documentTitle]);

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
      toast.error("Validation failed");
      return false;
    }
  };

  const handlePreview = async () => {
    await saveAll();
    const isValid = await validate();
    if (!isValid) return;
    const html = generatePrintHTML(template, sections, false);
    setPreviewHTML(html);
  };

  // ================= EXPORT =================
  const handleExport = async () => {
    const html = generatePrintHTML(template, sections, true);
    try {
      const res = await api.post(
        "/export/pdf",
        { html },
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "document.pdf";
      link.click();
    } catch {
      toast.error("Export failed");
    }
  };

  const handleExportWord = async () => {
    try {
      const res = await api.post(
        "/export/word",
        { template, sections },
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "document.docx";
      link.click();
    } catch {
      toast.error("Word export failed");
    }
  };

  const generateNumbering = (sections) => {
    const counters = {};
    return sections.map((sec) => {
      const level = sec.level || 1;
      if (!counters[level]) counters[level] = 0;
      counters[level]++;
      for (let i = level + 1; i <= 10; i++) counters[i] = 0;
      const number = Object.keys(counters)
        .slice(0, level)
        .map((lvl) => counters[lvl] || 0)
        .join(".");
      return { ...sec, number };
    });
  };

  const paginateSections = (sectionsList) => {
    const pages = [];
    let currentPage = [];
    let currentHeight = 0;

    sectionsList.forEach((sec) => {
      const estimatedHeight = 120 + (sections[sec.id]?.content?.length || 0) * 0.5;
      if (currentHeight + estimatedHeight > PAGE_HEIGHT) {
        pages.push(currentPage);
        currentPage = [];
        currentHeight = 0;
      }
      currentPage.push(sec);
      currentHeight += estimatedHeight;
    });

    if (currentPage.length) pages.push(currentPage);
    return pages;
  };

  if (loadError) return <div className="editor-loading"><p>{loadError}</p></div>;
  if (!template) return <div className="editor-loading"><div className="loader"></div><p>Preparing Workspace...</p></div>;

  const numberedSections = generateNumbering(template.sections);
  const pages = paginateSections(numberedSections);

  return (
    <div className="editor-workspace">
      {previewHTML && (
        <div className="preview-overlay">
          <div className="preview-modal">
            <div className="preview-header">
              <h3>Document Preview</h3>
              <button className="close-preview" onClick={() => setPreviewHTML("")}><FiX size={24} /></button>
            </div>
            <iframe title="preview" srcDoc={previewHTML} className="preview-frame" />
          </div>
        </div>
      )}

      <div className="editor-toolbar">
        <div className="toolbar-row toolbar-row-title">
          <div className="doc-icon-circle"><FiFileText /></div>
          <div className="title-group">
            <span className="template-label">Template · {template.name}</span>
            <input className="document-title-input" value={documentTitle} onChange={(e) => setDocumentTitle(e.target.value)} placeholder="Document name" />
          </div>
        </div>

        <div className="toolbar-row toolbar-row-actions">
          <button onClick={saveAll} className={`btn-save ${saving ? "saving-pulse" : ""}`} disabled={saving}><FiSave /> {saving ? "Saving..." : "Save"}</button>
          <button onClick={handlePreview} className="btn-secondary"><FiEye /> Preview</button>
          <div className="divider"></div>
          <button
            onClick={async () => {
              const newStatus = status === "completed" ? "draft" : "completed";
              if (newStatus === "completed") {
                const isValid = await validate();
                if (!isValid) return;
              }
              try {
                await api.put(`/documents/${documentId}/status`, { status: newStatus });
                setStatus(newStatus);
                toast.success(`Document marked as ${newStatus}`);
              } catch {
                toast.error("Failed to update status");
              }
            }}
            className="btn-secondary"
            style={status === "completed" ? { background: "#10b981", color: "white", borderColor: "#10b981" } : {}}
          >
            {status === "completed" ? "✓ Completed" : "Mark as Completed"}
          </button>
          <button onClick={handleExport} className="btn-export"><FiDownload /> PDF</button>
          <button onClick={handleExportWord} className="btn-export"><BiSolidFileDoc /> Word</button>
        </div>
      </div>

      <div className="document-scroller">
        {pages.map((page, pageIndex) => (
          <div key={pageIndex} className="page">
            {page.map((sec) => (
              <div key={sec.id} className="section-block">
                <div className={`section-header level-${sec.level}`}>
                  <span className="section-number">{sec.number}</span>
                  <input value={sections[sec.id]?.title || sec.title} onChange={(e) => handleTitleChange(sec.id, e.target.value)} className="editor-title-input" />
                </div>
                <textarea
                  placeholder="Start typing your content here..."
                  value={sections[sec.id]?.content || ""}
                  onChange={(e) => handleContentChange(sec.id, e.target.value)}
                  className={`editor-input ${errors[sec.id] ? "input-error" : ""}`}
                  rows={1}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                />
                {errors[sec.id] && <span className="error-text">{errors[sec.id]}</span>}
              </div>
            ))}
            <div className="page-footer">Page {pageIndex + 1}</div>
          </div>
        ))}
      </div>

      {showScrollTop && (
        <button className="scroll-top-fab" onClick={scrollToTop} title="Scroll to top"><FiChevronUp size={22} /></button>
      )}
    </div>
  );
};

export default Editor;
