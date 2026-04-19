import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const Dashboard = () => {
  const [templates, setTemplates] = useState([]);
  const navigate = useNavigate();

  // fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await api.get("/templates");
        setTemplates(res.data);
      } catch (err) {
        console.error("Failed to load templates", err);
      }
    };

    fetchTemplates();
  }, []);

  // create document
  const createDocument = async (templateId) => {
    const title = prompt("Enter document title:");
    if (!title) return;

    try {
      const res = await api.post("/documents", {
        title,
        template_id: templateId,
      });

      navigate(`/editor/${res.data.documentId}`);
    } catch (err) {
      alert("Failed to create document", err);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Dashboard</h2>

      <h3 className="text-3xl text-blue-600">Available Templates</h3>

      {templates.length === 0 && <p>No templates found</p>}

      {templates.map((template) => (
        <div
          key={template.id}
          style={{
            border: "1px solid #ccc",
            padding: "10px",
            marginBottom: "10px",
          }}
        >
          <h4>{template.name}</h4>
          <p>{template.description}</p>

          <button onClick={() => createDocument(template.id)}>
            Create Document
          </button>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
