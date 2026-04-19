import { useState, useRef } from "react";
import "./AdminTemplates.css";
import api from "../api/axios";

const AdminTemplates = () => {
  const [template, setTemplate] = useState({
    name: "",
    description: "",
    document_type_id: "",
    standard_id: "",
    active: true,
    default_font_family: "Times New Roman",
    default_line_height: 1.5,
    page_margin_top: 20,
    page_margin_bottom: 20,
    page_margin_left: 20,
    page_margin_right: 20,
  });

  const [errors, setErrors] = useState({});

  const [sections, setSections] = useState([]);

  const descriptionRef = useRef(null);

  const [standards, setStandards] = useState([]);

  const addSection = () => {
    setSections([
      ...sections,
      {
        title: "",
        level: 1,
        is_required: true,

        // TITLE STYLE
        title_font_size: 16,
        title_font_weight: "bold",
        title_text_align: "left",

        // BODY STYLE
        body_font_size: 12,
        body_font_weight: "normal",
        body_text_align: "left",

        line_height: 1.5,
        list_type: "none",

        margin_top: 10,
        margin_bottom: 10,
        padding_left: 0,
      },
    ]);
  };
  const removeSection = (index) => {
    const updated = sections.filter((_, i) => i !== index);
    setSections(updated);
  };

  const updateSection = (i, field, value) => {
    const updated = [...sections];
    updated[i][field] = value;
    setSections(updated);
  };

  const handleDescriptionChange = (e) => {
    setTemplate({ ...template, description: e.target.value });

    if (descriptionRef.current) {
      descriptionRef.current.style.height = "auto";
      descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
    }
  };

  const validate = () => {
    let newErrors = {};

    if (!template.name.trim()) {
      newErrors.name = "Template name is required";
    }

    if (!template.document_type_id || template.document_type_id == 0) {
      newErrors.document_type_id = "Select document type";
    }

    if (!template.standard_id || template.standard_id == 0) {
      newErrors.standard_id = "Select standard";
    }

    sections.forEach((sec, index) => {
      if (!sec.title.trim()) {
        newErrors[`section_title_${index}`] = "Section title required";
      }
    });

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const createTemplate = async () => {
    if (!validate()) return;

    try {
      await api.post("/templates", {
        ...template,
        document_type_id: Number(template.document_type_id),
        standard_id: Number(template.standard_id),
        sections,
      });

      alert("Template created successfully");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDocTypeChange = async (value) => {
    setTemplate({ ...template, document_type_id: value, standard_id: "" });

    try {
      const res = await api.get(`/standards/${value}`);
      setStandards(res.data);
    } catch (err) {
      console.error(err);
    }
  };
  return (
    <div className="container">
      <h1>Create Template</h1>

      <div className="card">
        <h2>Global Settings</h2>

        <input
          placeholder="Template Name"
          className={errors.name ? "error" : ""}
          value={template.name}
          onChange={(e) => setTemplate({ ...template, name: e.target.value })}
        />
        {errors.name && <p className="error-text">{errors.name}</p>}

        <textarea
          ref={descriptionRef}
          placeholder="Description"
          value={template.description}
          onChange={handleDescriptionChange}
          rows={1}
          className="auto-grow-textarea"
        />

        <select
          value={template.document_type_id}
          className={errors.document_type_id ? "error" : ""}
          onChange={(e) => handleDocTypeChange(e.target.value)}
        >
          <option value={0}>Document Type ID</option>
          <option value={1}>SRS</option>
          <option value={2}>SDS</option>
          <option value={3}>SDD</option>
        </select>
        {errors.document_type_id && (
          <p className="error-text">{errors.document_type_id}</p>
        )}

        <select
          value={template.standard_id}
          className={errors.standard_id ? "error" : ""}
          onChange={(e) =>
            setTemplate({ ...template, standard_id: e.target.value })
          }
        >
          <option value="">Select Standard</option>

          {standards.length === 0 ? (
            <option disabled>No standards available</option>
          ) : (
            standards.map((std) => (
              <option key={std.id} value={std.id}>
                {std.name}
              </option>
            ))
          )}
        </select>

        {errors.standard_id && (
          <p className="error-text">{errors.standard_id}</p>
        )}
        {errors.standard_id && (
          <p className="error-text">{errors.standard_id}</p>
        )}
        <label className="checkbox">
          <input
            type="checkbox"
            checked={template.active}
            onChange={(e) =>
              setTemplate({ ...template, active: e.target.checked })
            }
          />
          Active
        </label>

        <select
          value={template.default_font_family}
          onChange={(e) =>
            setTemplate({ ...template, default_font_family: e.target.value })
          }
        >
          <option>Times New Roman</option>
          <option>Arial</option>
          <option>Calibri</option>
        </select>

        <select
          value={template.default_line_height}
          onChange={(e) =>
            setTemplate({ ...template, default_line_height: e.target.value })
          }
        >
          <option value="1">Single</option>
          <option value="1.15">1.15</option>
          <option value="1.5">1.5</option>
          <option value="2">Double</option>
        </select>

        <div className="grid4">
          <input
            placeholder="Margin Top"
            value={template.page_margin_top}
            onChange={(e) =>
              setTemplate({ ...template, page_margin_top: e.target.value })
            }
          />
          <input
            placeholder="Margin Bottom"
            value={template.page_margin_bottom}
            onChange={(e) =>
              setTemplate({ ...template, page_margin_bottom: e.target.value })
            }
          />
          <input
            placeholder="Margin Left"
            value={template.page_margin_left}
            onChange={(e) =>
              setTemplate({ ...template, page_margin_left: e.target.value })
            }
          />
          <input
            placeholder="Margin Right"
            value={template.page_margin_right}
            onChange={(e) =>
              setTemplate({ ...template, page_margin_right: e.target.value })
            }
          />
        </div>
      </div>

      <div className="card">
        <h2>Sections</h2>

        {sections.map((sec, i) => (
          <div key={i} className="section-card">
            <button className="btn danger" onClick={() => removeSection(i)}>
              Remove
            </button>

            <input
              placeholder="Section Title"
              className={errors[`section_title_${i}`] ? "error" : ""}
              value={sec.title}
              onChange={(e) => updateSection(i, "title", e.target.value)}
            />
            {errors[`section_title_${i}`] && (
              <p className="error-text">{errors[`section_title_${i}`]}</p>
            )}

            <select
              value={sec.level}
              onChange={(e) => updateSection(i, "level", e.target.value)}
            >
              <option value={1}>Level 1 (1)</option>
              <option value={2}>Level 2 (1.1)</option>
              <option value={3}>Level 3 (1.1.1)</option>
            </select>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={sec.is_required}
                onChange={(e) =>
                  updateSection(i, "is_required", e.target.checked)
                }
              />
              Required
            </label>

            <h4>Title Formatting</h4>
            <div className="grid3">
              <select
                value={sec.title_font_size}
                onChange={(e) =>
                  updateSection(i, "title_font_size", e.target.value)
                }
              >
                {[14, 16, 18, 20].map((s) => (
                  <option key={s} value={s}>
                    {s} pt
                  </option>
                ))}
              </select>

              <select
                value={sec.title_font_weight}
                onChange={(e) =>
                  updateSection(i, "title_font_weight", e.target.value)
                }
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
              </select>

              <select
                value={sec.title_text_align}
                onChange={(e) =>
                  updateSection(i, "title_text_align", e.target.value)
                }
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>

            <h4>Body Formatting</h4>
            <div className="grid3">
              <select
                value={sec.body_font_size}
                onChange={(e) =>
                  updateSection(i, "body_font_size", e.target.value)
                }
              >
                {[10, 12, 14].map((s) => (
                  <option key={s} value={s}>
                    {s} pt
                  </option>
                ))}
              </select>

              <select
                value={sec.body_font_weight}
                onChange={(e) =>
                  updateSection(i, "body_font_weight", e.target.value)
                }
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
              </select>

              <select
                value={sec.body_text_align}
                onChange={(e) =>
                  updateSection(i, "body_text_align", e.target.value)
                }
              >
                <option value="left">Left</option>
                <option value="justify">Justify</option>
              </select>
            </div>
            <div className="grid2">
              <select
                value={sec.list_type}
                onChange={(e) => updateSection(i, "list_type", e.target.value)}
              >
                <option value="none">None</option>
                <option value="bullet">Bullet</option>
                <option value="numbered">Numbered</option>
              </select>

              <select
                value={sec.line_height}
                onChange={(e) =>
                  updateSection(i, "line_height", e.target.value)
                }
              >
                <option value="1">Single</option>
                <option value="1.5">1.5</option>
                <option value="2">Double</option>
              </select>
            </div>

            <div className="grid3">
              <input
                placeholder="Margin Top"
                value={sec.margin_top}
                onChange={(e) => updateSection(i, "margin_top", e.target.value)}
              />
              <input
                placeholder="Margin Bottom"
                value={sec.margin_bottom}
                onChange={(e) =>
                  updateSection(i, "margin_bottom", e.target.value)
                }
              />
              <input
                placeholder="Padding Left"
                value={sec.padding_left}
                onChange={(e) =>
                  updateSection(i, "padding_left", e.target.value)
                }
              />
            </div>
          </div>
        ))}

        <button className="btn" onClick={addSection}>
          Add Section
        </button>
      </div>

      <button className="btn primary" onClick={createTemplate}>
        Save Template
      </button>
    </div>
  );
};

export default AdminTemplates;
