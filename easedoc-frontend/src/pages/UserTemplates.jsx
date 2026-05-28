import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { FiFileText, FiTrash2, FiEdit, FiEye, FiAlertTriangle, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import "./UserTemplates.css";
import EasDocLoader from "../components/EasDocLoader";
import ComponentLoader from "../components/ComponentLoader";

const UserTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(null);
  const [usageInfo, setUsageInfo] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchUserTemplates();
  }, []);

  const fetchUserTemplates = async () => {
    try {
      const res = await api.get("/templates/user/customized");
      setTemplates(res.data);
    } catch {
      toast.error("Failed to load your templates.");
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = async (template) => {
    setDeletingTemplate(template);
    setDeleteLoading(true);
    setShowDeleteModal(true);
    try {
      const res = await api.get(`/templates/${template.id}/usage`);
      setUsageInfo(res.data);
    } catch {
      toast.error("Failed to fetch usage info.");
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/templates/${deletingTemplate.id}`);
      toast.success("Template deleted.");
      setShowDeleteModal(false);
      setTemplates(templates.filter(t => t.id !== deletingTemplate.id));
    } catch {
      toast.error("Failed to delete template.");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) return <EasDocLoader message="Loading your templates" />;

  return (
    <div className="user-templates-page">
      <header className="page-header">
        <div className="header-info">
          <h1>My Customized Templates</h1>
          <p>Templates you've customized for your specific needs.</p>
        </div>
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
                <button className="action-btn view" onClick={() => navigate(`/user/templates/details/${t.id}`)}>
                  <FiEye /> View
                </button>
                <button className="action-btn edit" onClick={() => navigate(`/user/templates/edit/${t.id}`)}>
                  <FiEdit /> Edit
                </button>
                <button className="action-btn delete" onClick={() => openDeleteModal(t)}>
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <FiFileText size={48} />
            <h3>No Customized Templates Yet</h3>
            <p>Browse the available templates and customize one to fit your needs.</p>
            <button className="btn btn-primary" onClick={() => navigate("/user/documents/create")}>
              Browse &amp; Customize Templates
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="delete-modal animate-scale-up">
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="close-btn"
              >
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              {deleteLoading && !usageInfo ? (
                <ComponentLoader message="Checking template usage" />
              ) : usageInfo ? (
                <>
                  <div className="warning-box">
                    <FiAlertTriangle className="warning-icon" size={24} />
                    <div>
                      <strong>Warning:</strong> {usageInfo.canDeleteTemplate
                        ? "You are about to delete the entire template. This action is irreversible."
                        : "Some versions are in use and cannot be deleted."}
                    </div>
                  </div>

                  <div className="usage-stats">
                    <p>
                      <span>Total Versions</span>
                      <strong>{usageInfo.totalVersions}</strong>
                    </p>
                    <p>
                      <span>Versions in Use</span>
                      <strong>{usageInfo.usedVersionsCount}</strong>
                    </p>
                    <p>
                      <span>To be Deleted</span>
                      <strong>{usageInfo.unusedVersions.length}</strong>
                    </p>
                  </div>

                  {usageInfo.usedVersionsCount > 0 && (
                    <p className="notice" style={{marginTop: '1rem', fontSize: '0.8125rem'}}>
                      Note: Versions linked to documents will be preserved to maintain document integrity.
                    </p>
                  )}

                  {usageInfo.usedVersionsCount > 0 &&
                    usageInfo.unusedVersions.length === 0 && (
                      <p className="error-text" style={{marginTop: '1rem', color: 'var(--error)'}}>
                        All versions of this template are currently in use.
                      </p>
                    )}
                </>
              ) : null}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={
                  deleteLoading ||
                  (usageInfo &&
                    !usageInfo.canDeleteTemplate &&
                    usageInfo.unusedVersions.length === 0)
                }
              >
                {deleteLoading ? "Processing..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTemplates;
