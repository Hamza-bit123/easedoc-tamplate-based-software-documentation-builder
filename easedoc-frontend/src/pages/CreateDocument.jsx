import { useState, useEffect } from "react";
import api from "../api/axios";
import "./CreateDocument.css";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { usePopup } from "../context/PopupContext";

const CreateDocument = () => {
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [standards, setStandards] = useState([]);
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [templates, setTemplates] = useState([]);
  const navigate = useNavigate();
  const { showPopup } = usePopup();

  // fetch standards
  const fetchStandards = async (typeId) => {
    try {
      const res = await api.get(`/standards/${typeId}`);
      setStandards(res.data);
      setTemplates([]);
      setSelectedStandard(null);
    } catch {
      // Error handled
      setStandards([]);
    }
  };

  // fetch templates
  const fetchTemplates = async (typeId, standardId) => {
    try {
      const res = await api.get(
        `/templates/type/${typeId}?standard_id=${standardId}`,
      );
      setTemplates(res.data);
    } catch {
      // Error handled
      setTemplates([]);
    }
  };

  const use_template = async (templateId) => {
    try {
      const res = await api.post("/documents", {
        template_id: templateId,
        title: "New Document",
      });

      const documentId = res.data.documentId;

      navigate(`/editor/${documentId}`);
      toast.success("Document created successfully!");
    } catch {
      // Error handled
      toast.error("Failed to create document.");
    }
  };

  const customizeTemplate = (templateId) => {
    showPopup({
      type: 'warning',
      title: 'Customize Template',
      message: 'WARNING: Customizing this template will create a private copy for you. If the administrator deletes the base template, your customized version will also be deleted cascadingly. Do you want to proceed?',
      confirmText: 'Yes, Customize',
      onConfirm: async () => {
        try {
          const res = await api.post(`/templates/${templateId}/customize`);
          toast.success(res.data.message);
          navigate("/user/templates");
        } catch {
          toast.error("Failed to customize template.");
        }
      }
    });
  };

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await api.get("/document-types");
        setTypes(res.data);
      } catch {
      // Error handled
      }
    };

    fetchTypes();
  }, []);

  return (
    <div className="dashboard">
      <h1>Start New Document</h1>

      <div className="card">
        <h2>Select Document Type</h2>

        <div className="grid">
          {types.map((t) => (
            <div
              key={t.id}
              className={`box ${selectedType === t.id ? "active" : ""}`}
              onClick={() => {
                setSelectedType(t.id);
                fetchStandards(t.id);
              }}
            >
              {t.name}
            </div>
          ))}
        </div>
      </div>

      {selectedType && (
        <div className="card">
          <h2>Select Standard</h2>

          {standards.length === 0 ? (
            <p className="empty">No standards available</p>
          ) : (
            <div className="grid">
              {standards.map((s) => (
                <div
                  key={s.id}
                  className={`box ${selectedStandard === s.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedStandard(s.id);
                    fetchTemplates(selectedType, s.id);
                  }}
                >
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {selectedStandard && (
        <div className="card">
          <h2>Available Templates</h2>

          {templates.length === 0 ? (
            <p className="empty">No templates found</p>
          ) : (
            <div className="grid">
              {templates.map((t) => (
                <div key={t.id} className="template-card">
                  <h3>{t.name}</h3>
                  <p>{t.description}</p>

                  <div className="template-actions">
                    <button className="btn btn-primary" onClick={() => use_template(t.id)}>
                      Use Template
                    </button>
                    <button 
                      className="btn-outline" 
                      onClick={() => customizeTemplate(t.id)}
                    >
                      Customize
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreateDocument;
