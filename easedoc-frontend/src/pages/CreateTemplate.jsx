import { useState, useRef, useEffect, useContext } from "react";
import "./CreateTemplate.css";
import api from "../api/axios";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";

const CreateTemplate = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === "admin";
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

  const { id } = useParams();

  const isEdit = !!id;

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

  const saveTemplate = async () => {
    if (!validate()) return;

    try {
      if (isEdit) {
        await api.put(`/templates/${id}`, {
          template,
          sections,
        });

        toast.success("Template updated successfully");
        // Admins go back to the admin templates list; users go to their template's detail page
        navigate(isAdmin ? "/admin/templates" : `/user/templates/details/${id}`);
      } else {
        await api.post("/templates", {
          ...template,
          document_type_id: Number(template.document_type_id),
          standard_id: Number(template.standard_id),
          sections,
        });

        toast.success("Template created successfully");
        navigate(isAdmin ? "/admin/templates" : "/user/templates");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save template.");
    }
  };


  const handleDocTypeChange = async (value) => {
    setTemplate({ ...template, document_type_id: value, standard_id: "" });

    try {
      const res = await api.get(`/standards/${value}`);
      setStandards(res.data);
    } catch {
      // Error handled by caller or toast
    }
  };

  useEffect(() => {
    if (!isEdit) return;

    const fetchTemplate = async () => {
      try {
        const res = await api.get(`/templates/${id}/full`);

        const data = res.data;

        setTemplate({
          name: data.name,
          description: data.description,
          document_type_id: data.document_type_id,
          standard_id: data.standard_id,
          active: data.active,
          default_font_family: data.default_font_family,
          default_line_height: data.default_line_height,
          page_margin_top: data.page_margin_top,
          page_margin_bottom: data.page_margin_bottom,
          page_margin_left: data.page_margin_left,
          page_margin_right: data.page_margin_right,
        });

        setSections(data.sections);
      } catch {
        // Silently fail or handle elsewhere
      }
    };

    fetchTemplate();
  }, [id]);

  return (
    <div className="container">
      <h1>Create Template</h1>

      <div className="card">
        <h2>Global Settings</h2>

        <div className="form-group">
          <label className="form-label">Template Name</label>
          <input
            placeholder="Template Name"
            className={errors.name ? "error form-input" : "form-input"}
            value={template.name}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
          />
          {errors.name && <p className="error-text">{errors.name}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            ref={descriptionRef}
            placeholder="Description"
            value={template.description}
            onChange={handleDescriptionChange}
            rows={1}
            className="auto-grow-textarea form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Document Type</label>
          <select
            value={template.document_type_id}
            className={errors.document_type_id ? "error form-input" : "form-input"}
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
        </div>

        <div className="form-group">
          <label className="form-label">Standard</label>
          <select
            value={template.standard_id}
            className={errors.standard_id ? "error form-input" : "form-input"}
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
        </div>

        <div className="form-group">
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
        </div>

        <div className="form-group">
          <label className="form-label">Default Font Family</label>
          <select
            value={template.default_font_family}
            className="form-input"
            onChange={(e) =>
              setTemplate({ ...template, default_font_family: e.target.value })
            }
          >
            <option>Times New Roman</option>
            <option>Arial</option>
            <option>Calibri</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Default Line Height</label>
          <select
            value={template.default_line_height}
            className="form-input"
            onChange={(e) =>
              setTemplate({ ...template, default_line_height: e.target.value })
            }
          >
            <option value="1">Single</option>
            <option value="1.15">1.15</option>
            <option value="1.5">1.5</option>
            <option value="2">Double</option>
          </select>
        </div>

        <div className="grid4">
          <div className="form-group">
            <label className="form-label">Margin Top</label>
            <input
              placeholder="Margin Top"
              className="form-input"
              value={template.page_margin_top}
              onChange={(e) =>
                setTemplate({ ...template, page_margin_top: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Margin Bottom</label>
            <input
              placeholder="Margin Bottom"
              className="form-input"
              value={template.page_margin_bottom}
              onChange={(e) =>
                setTemplate({ ...template, page_margin_bottom: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Margin Left</label>
            <input
              placeholder="Margin Left"
              className="form-input"
              value={template.page_margin_left}
              onChange={(e) =>
                setTemplate({ ...template, page_margin_left: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Margin Right</label>
            <input
              placeholder="Margin Right"
              className="form-input"
              value={template.page_margin_right}
              onChange={(e) =>
                setTemplate({ ...template, page_margin_right: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Sections</h2>

        {sections.map((sec, i) => (
          <div key={i} className="section-card">
            <button className="btn danger" onClick={() => removeSection(i)}>
              Remove
            </button>

            <div className="form-group">
              <label className="form-label">Section Title</label>
              <input
                placeholder="Section Title"
                className={errors[`section_title_${i}`] ? "error form-input" : "form-input"}
                value={sec.title}
                onChange={(e) => updateSection(i, "title", e.target.value)}
              />
              {errors[`section_title_${i}`] && (
                <p className="error-text">{errors[`section_title_${i}`]}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Level</label>
              <select
                value={sec.level}
                className="form-input"
                onChange={(e) => updateSection(i, "level", e.target.value)}
              >
                <option value={1}>Level 1 (1)</option>
                <option value={2}>Level 2 (1.1)</option>
                <option value={3}>Level 3 (1.1.1)</option>
              </select>
            </div>

            <div className="form-group">
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
            </div>

            <h4>Title Formatting</h4>
            <div className="grid3">
              <div className="form-group">
                <label className="form-label">Title Font Size</label>
                <select
                  value={sec.title_font_size}
                  className="form-input"
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
              </div>

              <div className="form-group">
                <label className="form-label">Title Font Weight</label>
                <select
                  value={sec.title_font_weight}
                  className="form-input"
                  onChange={(e) =>
                    updateSection(i, "title_font_weight", e.target.value)
                  }
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Title Text Align</label>
                <select
                  value={sec.title_text_align}
                  className="form-input"
                  onChange={(e) =>
                    updateSection(i, "title_text_align", e.target.value)
                  }
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>

            <h4>Body Formatting</h4>
            <div className="grid3">
              <div className="form-group">
                <label className="form-label">Body Font Size</label>
                <select
                  value={sec.body_font_size}
                  className="form-input"
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
              </div>

              <div className="form-group">
                <label className="form-label">Body Font Weight</label>
                <select
                  value={sec.body_font_weight}
                  className="form-input"
                  onChange={(e) =>
                    updateSection(i, "body_font_weight", e.target.value)
                  }
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Body Text Align</label>
                <select
                  value={sec.body_text_align}
                  className="form-input"
                  onChange={(e) =>
                    updateSection(i, "body_text_align", e.target.value)
                  }
                >
                  <option value="left">Left</option>
                  <option value="justify">Justify</option>
                </select>
              </div>
            </div>
            <div className="grid2">
              <div className="form-group">
                <label className="form-label">List Type</label>
                <select
                  value={sec.list_type}
                  className="form-input"
                  onChange={(e) => updateSection(i, "list_type", e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="bullet">Bullet</option>
                  <option value="numbered">Numbered</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Line Height</label>
                <select
                  value={sec.line_height}
                  className="form-input"
                  onChange={(e) =>
                    updateSection(i, "line_height", e.target.value)
                  }
                >
                  <option value="1">Single</option>
                  <option value="1.5">1.5</option>
                  <option value="2">Double</option>
                </select>
              </div>
            </div>

            <div className="grid3">
              <div className="form-group">
                <label className="form-label">Margin Top</label>
                <input
                  placeholder="Margin Top"
                  className="form-input"
                  value={sec.margin_top}
                  onChange={(e) => updateSection(i, "margin_top", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Margin Bottom</label>
                <input
                  placeholder="Margin Bottom"
                  className="form-input"
                  value={sec.margin_bottom}
                  onChange={(e) =>
                    updateSection(i, "margin_bottom", e.target.value)
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Padding Left</label>
                <input
                  placeholder="Padding Left"
                  className="form-input"
                  value={sec.padding_left}
                  onChange={(e) =>
                    updateSection(i, "padding_left", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        ))}

        <button className="btn" onClick={addSection}>
          Add Section
        </button>
      </div>

      <button className="btn primary" onClick={saveTemplate}>
        {isEdit ? "Create New Version" : "Save Template"}
      </button>
    </div>
  );
};

export default CreateTemplate;
