import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { FiArrowLeft, FiLayers, FiCalendar, FiUser, FiInfo } from "react-icons/fi";
import "./TemplateDetails.css";

const TemplateDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/templates/${id}/details`);
        setTemplate(res.data);
      } catch {
        // Error fetching details
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) return <div className="details-loading">Loading template details...</div>;
  if (!template) return <div className="details-error">Template not found.</div>;

  return (
    <div className="template-details-page">
      <div className="details-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>
        <h1>Template Details</h1>
      </div>

      <div className="details-grid">
        {/* Main Info Card */}
        <div className="details-card main-info">
          <div className="card-header">
            <FiInfo className="header-icon" />
            <h2>General Information</h2>
          </div>
          <div className="info-group">
            <label>Template Name</label>
            <p>{template.name}</p>
          </div>
          <div className="info-group">
            <label>Description</label>
            <p>{template.description || "No description provided."}</p>
          </div>
          <div className="info-row">
            <div className="info-group">
              <label>Document Type</label>
              <p>{template.document_type_name}</p>
            </div>
            <div className="info-group">
              <label>Standard</label>
              <p>{template.standard_name}</p>
            </div>
          </div>
          <div className="info-row">
            <div className="info-group">
              <label>Created At</label>
              <div className="icon-text">
                <FiCalendar /> {new Date(template.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="info-group">
              <label>User Customizations</label>
              <p><strong>{template.customizationCount || 0}</strong> users have customized this template</p>
            </div>
          </div>
          <div className="info-row">
            <div className="info-group">
              <label>Status</label>
              <span className={`status-badge ${template.active ? "active" : "inactive"}`}>
                {template.active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        {/* Versions Card */}
        <div className="details-card versions-card">
          <div className="card-header">
            <FiLayers className="header-icon" />
            <h2>Version History</h2>
          </div>
          <div className="versions-list">
            {template.versions && template.versions.length > 0 ? (
              template.versions.map((v) => (
                <div key={v.id} className={`version-item ${v.is_active ? "current" : ""}`}>
                  <div className="version-info">
                    <span className="version-number">v{v.version_number}</span>
                    <span className="version-date">
                      {new Date(v.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {v.is_active && <span className="current-badge">Current</span>}
                  <button 
                    className="view-version-btn"
                    onClick={() => navigate(`/admin/templates/edit/${template.id}`)}
                  >
                    Edit
                  </button>
                </div>
              ))
            ) : (
              <p className="no-versions">No version history found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateDetails;
