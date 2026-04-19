// import { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import api from "../api/axios";
// import "./Editor.css";
// import generatePrintHTML from "../utils/generatePrintHTML";

// const Editor = () => {
//   const { documentId } = useParams();

//   const [template, setTemplate] = useState(null);
//   const [sections, setSections] = useState({});
//   const [errors, setErrors] = useState({});
//   const [previewMode, setPreviewMode] = useState(false);
//   const [saving, setSaving] = useState(false);

//   useEffect(() => {
//     loadEditor();
//     setupAutoSave();
//   }, []);

//   // 🔥 LOAD DATA
//   const loadEditor = async () => {
//     try {
//       const doc = await api.get(`/documents/${documentId}`);
//       const temp = await api.get(`/templates/${doc.data.template_id}/full`);
//       const sec = await api.get(`/document-sections/${documentId}`);

//       let map = {};
//       sec.data.forEach((s) => {
//         map[s.template_section_id] = s.content;
//       });

//       setTemplate(temp.data);
//       setSections(map);
//     } catch {
//       alert("Failed to load editor");
//     }
//   };

//   const setupAutoSave = () => {
//     window.addEventListener("keydown", async (e) => {
//       if (e.ctrlKey && e.key === "s") {
//         e.preventDefault();
//         await saveAll();
//       }
//     });
//   };

//   const saveAll = async () => {
//     try {
//       setSaving(true);

//       for (let sec of template.sections) {
//         await api.post("/document-sections/save", {
//           document_id: documentId,
//           template_section_id: sec.id,
//           content: sections[sec.id] || "",
//         });
//       }

//       setSaving(false);
//     } catch (err) {
//       setSaving(false);
//       alert("Save failed");
//       console.log(err);
//     }
//   };
//   const validate = async () => {
//     try {
//       const res = await api.get(`/documents/${documentId}/validate`);

//       let errMap = {};
//       res.data.errors.forEach((e) => {
//         errMap[e.section_id] = e.message;
//       });

//       setErrors(errMap);

//       return Object.keys(errMap).length === 0;
//     } catch {
//       alert("Validation failed");
//       return false;
//     }
//   };

//   const handlePreview = async () => {
//     await saveAll();
//     const isValid = await validate();

//     if (!isValid) {
//       alert("Fix errors before preview");
//       return;
//     }

//     setPreviewMode(true);

//     const html = generatePrintHTML(template, sections);

//     const previewWindow = window.open("", "_blank");

//     previewWindow.document.open();
//     previewWindow.document.write(html);
//     previewWindow.document.close();

//     previewWindow.focus();
//     previewWindow.print();
//   };

//   const handleChange = (id, value) => {
//     setSections({
//       ...sections,
//       [id]: value,
//     });
//   };

//   const handleExport = async () => {
//     try {
//       const res = await api.get(`/export/pdf/${documentId}`, {
//         responseType: "blob", // 🔥 IMPORTANT
//       });

//       const url = window.URL.createObjectURL(new Blob([res.data]));
//       const link = document.createElement("a");

//       link.href = url;
//       link.setAttribute("download", "document.pdf");
//       document.body.appendChild(link);

//       link.click();
//     } catch (err) {
//       alert("Export failed");
//       console.log(err);
//     }
//   };

//   const getSectionStyle = (sec) => {
//     return {
//       fontSize: `${sec.font_size || 14}px`,
//       fontWeight: sec.font_weight || "normal",
//       textAlign: sec.text_align || "left",
//       lineHeight: sec.line_height || 1.5,
//       marginTop: `${sec.margin_top || 10}px`,
//       marginBottom: `${sec.margin_bottom || 10}px`,
//       paddingLeft: `${sec.padding_left || 0}px`,
//     };
//   };

//   const generateNumbering = (sections) => {
//     const counters = {};

//     return sections?.map((sec) => {
//       const level = sec.level || 1;

//       if (!counters[level]) counters[level] = 0;

//       counters[level]++;

//       // reset deeper levels
//       for (let i = level + 1; i <= 5; i++) {
//         counters[i] = 0;
//       }

//       const number = Object.keys(counters)
//         .slice(0, level)
//         .map((lvl) => counters[lvl] || 0)
//         .join(".");

//       return {
//         ...sec,
//         number,
//       };
//     });
//   };

//   if (!template) return <p>Loading...</p>;

//   const numberedSections = generateNumbering(template?.sections || []);

//   return (
//     <div className="editor">
//       <div className="editor-header">
//         <h1>{template.name}</h1>

//         <div>
//           <button onClick={saveAll}>{saving ? "Saving..." : "Save"}</button>

//           {!previewMode && <button onClick={handlePreview}>Preview</button>}
//           <button
//             onClick={() => {
//               handleExport;
//               setTimeout(() => {
//                 window.open(`/api/export/pdf/${documentId}`);
//               }, 500);
//             }}
//           >
//             Export PDF
//           </button>

//           {previewMode && (
//             <button onClick={() => setPreviewMode(false)}>
//               Back to Editing
//             </button>
//           )}
//         </div>
//       </div>
//       {!previewMode &&
//         template.sections.map((sec) => (
//           <div key={sec.id} className="section">
//             <h2 className={`level-${sec.level}`}>
//               {sec.number} {sec.title}
//             </h2>

//             <textarea
//               value={sections[sec.id] || ""}
//               onChange={(e) => handleChange(sec.id, e.target.value)}
//               className={`editor-input ${errors[sec.id] ? "error" : ""}`}
//               rows={1}
//               onInput={(e) => {
//                 e.target.style.height = "auto";
//                 e.target.style.height = e.target.scrollHeight + "px";
//               }}
//             />

//             {errors[sec.id] && <p className="error-text">{errors[sec.id]}</p>}
//           </div>
//         ))}
//       {/* {previewMode && (
//         <div className="preview-overlay">
//           <div className="preview-toolbar">
//             <button onClick={() => setPreviewMode(false)}>
//               ← Back to Editing
//             </button>

//             <button onClick={handleExport}>Export PDF</button>
//           </div>
//           <div
//             className="preview-paper"
//             style={{
//               fontFamily: template.default_font_family,
//               lineHeight: template.default_line_height,
//               paddingTop: `${template.page_margin_top}mm`,
//               paddingBottom: `${template.page_margin_bottom}mm`,
//               paddingLeft: `${template.page_margin_left}mm`,
//               paddingRight: `${template.page_margin_right}mm`,
//             }}
//           >
//             {numberedSections?.sections?.map((sec) => {
//               const content = sections[sec.id] || "";

//               return (
//                 <div key={sec.id} style={getSectionStyle(sec)}>
//                   <h4 className="section-title">{sec.title}</h4>

//                   {sec.list_type === "bullet" ? (
//                     <ul>
//                       {content.split("\n").map((line, i) => (
//                         <li key={i}>{line}</li>
//                       ))}
//                     </ul>
//                   ) : sec.list_type === "numbered" ? (
//                     <ol>
//                       {content.split("\n").map((line, i) => (
//                         <li key={i}>{line}</li>
//                       ))}
//                     </ol>
//                   ) : (
//                     <p>{content}</p>
//                   )}
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       )} */}
//     </div>
//   );
// };

// export default Editor;

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
    previewWindow.print();
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

  if (!template) return <p>Loading...</p>;

  const numberedSections = generateNumbering(template.sections);
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
