import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { FiFileText, FiTrash2, FiEdit, FiEye } from "react-icons/fi";
import toast from "react-hot-toast";
import "./UserTemplates.css";

const UserTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserTemplates();
  }, []);

  const fetchUserTemplates = async () => {
    try {
      const res = await api.get("/templates/user/customized");
      setTemplates(res.data);
    } catch (err) {
      toast.error("Failed to load your templates.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customized template?")) return;
    try {
      await api.delete(`/templates/${id}`);
      setTemplates(templates.filter(t => t.id !== id));
      toast.success("Template deleted.");
    } catch (err) {
      toast.error("Failed to delete template.");
    }
  };

  if (loading) return <div className="loading-state">Loading your templates...</div>;

  return (
    <div className="user-templates-page">
      <header className="page-header">
        <h1>My Customized Templates</h1>
        <p>Templates you've customized for your specific needs.</p>
      </header>

      <div className="templates-grid">
        {templates.length > 0 ? (
          templates.map((t) => (
            <div key={t.id} className="template-card">
              <div className="card-top">
                <FiFileText className="template-icon" />
                <span className="doc-type-badge">{t.document_type_name}</span>
              </div>
              <div className="card-content">
                <h3>{t.name}</h3>
                <p>{t.description || "No description provided."}</p>
                <div className="meta">
                  <span>v{t.version}</span>
                  <span>{t.standard_name}</span>
                </div>
              </div>
              <div className="card-actions">
                <button className="action-btn view" onClick={() => navigate(`/admin/templates/details/${t.id}`)}>
                  <FiEye /> View
                </button>
                <button className="action-btn edit" onClick={() => navigate(`/admin/templates/edit/${t.id}`)}>
                  <FiEdit /> Edit
                </button>
                <button className="action-btn delete" onClick={() => handleDelete(t.id)}>
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <FiFileText size={48} />
            <h3>No Customized Templates</h3>
            <p>You haven't customized any templates yet. Go to the dashboard to start.</p>
            <button className="btn-primary" onClick={() => navigate("/user")}>
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserTemplates;
