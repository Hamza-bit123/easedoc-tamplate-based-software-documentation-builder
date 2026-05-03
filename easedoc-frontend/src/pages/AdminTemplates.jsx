import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./AdminTemplates.css";
import { FiFileText, FiLayers, FiAlertTriangle, FiX } from "react-icons/fi";
import { FaServer } from "react-icons/fa";
import { BiEdit, BiPlus } from "react-icons/bi";
import { BsEye, BsTrash2 } from "react-icons/bs";
import toast from "react-hot-toast";

const DOC_TYPES = [
  {
    id: 1,
    name: "SRS",
    description: "Software Requirements Specification.",
    icon: <FiFileText size={24} />,
  },
  {
    id: 2,
    name: "SDS",
    description: "System Design Specification.",
    icon: <FaServer size={24} />,
  },
  {
    id: 3,
    name: "SDD",
    description: "Software Design Document.",
    icon: <FiLayers size={24} />,
  },
];

const AdminTemplates = () => {
  const navigate = useNavigate();
  const [templateFilter, setTemplateFilter] = useState({
    document_type_id: 1, // Default to SRS
    standard_id: "all",
  });

  const [standards, setStandards] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(null);
  const [usageInfo, setUsageInfo] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 1. Fetch Templates Logic
  const fetchTemplates = useCallback(async (typeId, standardId) => {
    setLoading(true);
    try {
      const res = await api.get(
        `/templates/type/${typeId}?standard_id=${standardId}`,
      );
      setTemplates(res.data);
    } catch (err) {
      console.error("Error fetching templates:", err);
      toast.error("Failed to load templates.");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Fetch Standards (when doc type changes)
  const handleDocTypeChange = async (value) => {
    setTemplateFilter({ document_type_id: value, standard_id: "all" });
    try {
      const res = await api.get(`/standards/${value}`);
      setStandards(res.data);
      fetchTemplates(value, "all");
    } catch (err) {
      console.error(err);
      toast.error("Failed to load standards.");
    }
  };

  // 3. Handle Standard Filter Click
  const handleStandardSelect = (id) => {
    setTemplateFilter((prev) => ({ ...prev, standard_id: id }));
    fetchTemplates(templateFilter.document_type_id, id);
  };

  useEffect(() => {
    handleDocTypeChange(1);
  }, []);

  // Delete Handlers
  const openDeleteModal = async (template) => {
    setDeletingTemplate(template);
    setDeleteLoading(true);
    setShowDeleteModal(true);
    try {
      const res = await api.get(`/templates/${template.id}/usage`);
      setUsageInfo(res.data);
    } catch (err) {
      toast.error("Failed to fetch usage info.");
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/templates/${deletingTemplate.id}`);
      toast.success(res.data.message);
      setShowDeleteModal(false);
      fetchTemplates(templateFilter.document_type_id, templateFilter.standard_id);
    } catch (err) {
      toast.error("Deletion failed.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="admin-templates-page">
      <header className="templates-header">
        <div className="header-left">
          <h1>Template Management</h1>
        </div>
        <button
          className="add-template-btn"
          onClick={() => navigate("/admin/templates/create")}
        >
          <BiPlus size={18} /> Add Template
        </button>
      </header>

      <main className="templates-container">
        {/* Document Type Cards */}
        <section className="filter-section">
          <div className="doc-type-grid">
            {DOC_TYPES.map((doc) => (
              <div
                key={doc.id}
                className={`type-card ${templateFilter.document_type_id === doc.id ? "active" : ""}`}
                onClick={() => handleDocTypeChange(doc.id)}
              >
                <div className="type-icon">{doc.icon}</div>
                <div className="type-info">
                  <h3>{doc.name}</h3>
                  <p>{doc.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Standards Pill Filter */}
        <div className="standards-filter-bar">
          <button
            className={`pill ${templateFilter.standard_id === "all" ? "active" : ""}`}
            onClick={() => handleStandardSelect("all")}
          >
            All Standards
          </button>
          {standards.map((std) => (
            <button
              key={std.id}
              className={`pill ${templateFilter.standard_id === std.id ? "active" : ""}`}
              onClick={() => handleStandardSelect(std.id)}
            >
              {std.name}
            </button>
          ))}
        </div>

        {/* Template List Section */}
        <section className="template-list-section">
          <div className="list-header">
            <h2>Available Templates ({templates.length})</h2>
          </div>

          {loading ? (
            <div className="loader">Loading templates...</div>
          ) : (
            <div className="template-table-wrapper">
              <table className="template-table">
                <thead>
                  <tr>
                    <th>Template Name</th>
                    <th>Standard</th>
                    <th>Version</th>
                    <th>Updated At</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.length > 0 ? (
                    templates.map((t) => (
                      <tr key={t.id}>
                        <td className="font-medium">{t.name}</td>
                        <td>
                          <span className="badge">
                            {t.standard_name || "N/A"}
                          </span>
                        </td>
                        <td>v{t.version || "1.0"}</td>
                        <td>{new Date(t.updated_at).toLocaleDateString()}</td>
                        <td className="action-buttons">
                          <button
                            className="icon-btn view"
                            title="View Details"
                            onClick={() => navigate(`/admin/templates/details/${t.id}`)}
                          >
                            <BsEye size={16} />
                          </button>
                          <button
                            className="icon-btn edit"
                            title="Edit"
                            onClick={() => {
                              navigate(`/admin/templates/edit/${t.id}`);
                            }}
                          >
                            <BiEdit size={16} />
                          </button>
                          <button 
                            className="icon-btn delete" 
                            title="Delete"
                            onClick={() => openDeleteModal(t)}
                          >
                            <BsTrash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-state">
                        No templates found for this selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button onClick={() => setShowDeleteModal(false)} className="close-btn"><FiX /></button>
            </div>
            
            <div className="modal-body">
              {deleteLoading && !usageInfo ? (
                <p>Checking usage...</p>
              ) : usageInfo ? (
                <>
                  <div className="warning-box">
                    <FiAlertTriangle className="warning-icon" />
                    <div>
                      <strong>Warning:</strong> You are about to delete 
                      {usageInfo.canDeleteTemplate ? " the entire template." : " unused versions."}
                    </div>
                  </div>

                  <div className="usage-stats">
                    <p>Total Versions: <strong>{usageInfo.totalVersions}</strong></p>
                    <p>Versions in Use: <strong>{usageInfo.usedVersionsCount}</strong></p>
                    <p>Unused Versions to be Deleted: <strong>{usageInfo.unusedVersions.length}</strong></p>
                  </div>

                  {usageInfo.usedVersionsCount > 0 && usageInfo.unusedVersions.length > 0 && (
                    <p className="notice">
                      Note: {usageInfo.usedVersionsCount} version{usageInfo.usedVersionsCount > 1 ? "s" : ""} cannot be deleted because {usageInfo.usedVersionsCount > 1 ? "they have" : "it has"} been used to create documents.
                    </p>
                  )}

                  {usageInfo.usedVersionsCount > 0 && usageInfo.unusedVersions.length === 0 && (
                    <p className="error-text">No versions can be deleted as all are currently in use.</p>
                  )}
                </>
              ) : null}
            </div>

            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm-delete"
                onClick={confirmDelete}
                disabled={deleteLoading || (usageInfo && !usageInfo.canDeleteTemplate && usageInfo.unusedVersions.length === 0)}
              >
                {deleteLoading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTemplates;
