import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { FiArrowLeft, FiLayers, FiCalendar, FiUser, FiInfo, FiChevronDown, FiChevronUp, FiSliders } from "react-icons/fi";
import "./TemplateDetails.css";
import EasDocLoader from "../components/EasDocLoader";
import { AuthContext } from "../context/AuthContext";

const TemplateDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === "admin";
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeepDetails, setShowDeepDetails] = useState(false);
  const [fullTemplateDetails, setFullTemplateDetails] = useState(null);
  const [loadingDeepDetails, setLoadingDeepDetails] = useState(false);

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

  if (loading) return <EasDocLoader message="Loading template details" />;
  if (!template) return <div className="details-error">Template not found.</div>;

  const activeVersion = template.versions?.find(v => v.is_active) || template.versions?.[0] || {};

  const toggleDeepDetails = async () => {
    if (!showDeepDetails && !fullTemplateDetails) {
      setLoadingDeepDetails(true);
      try {
        // Fetch the full template which includes sections and detailed version formatting
        const res = await api.get(`/templates/${id}/full`);
        setFullTemplateDetails(res.data);
      } catch (err) {
        console.error("Failed to load full template details", err);
      } finally {
        setLoadingDeepDetails(false);
      }
    }
    setShowDeepDetails(!showDeepDetails);
  };

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
                  <div className="version-actions">
                    {v.is_active && <span className="current-badge">Current</span>}
                    <button 
                      className="view-version-btn"
                      onClick={() => navigate(isAdmin ? `/admin/templates/edit/${template.id}` : `/user/templates/edit/${template.id}`)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-versions">No version history found.</p>
            )}
          </div>
        </div>
      </div>

      {/* Deep Detail Magical Toggle */}
      <div className="deep-details-toggle-wrapper">
        <button 
          className={`magical-toggle-btn ${showDeepDetails ? 'open' : ''}`}
          onClick={toggleDeepDetails}
          title={showDeepDetails ? "Hide Formatting Rules" : "Show Formatting Rules"}
          disabled={loadingDeepDetails}
        >
          <FiSliders className="magical-icon" />
          <span>{loadingDeepDetails ? "Loading Deep Details..." : (showDeepDetails ? "Hide Deep Details" : "Show Deep Details")}</span>
          {showDeepDetails ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>

      {/* Deep Details Section */}
      {showDeepDetails && (
        <div className="deep-details-content animate-fade-in">
          <div className="details-card">
            <div className="card-header">
              <FiSliders className="header-icon" />
              <h2>Global Formatting Rules</h2>
            </div>
            <div className="formatting-rules-grid">
              <div className="rule-item">
                <label>Font Family</label>
                <p>{activeVersion.default_font_family || 'Default'}</p>
              </div>
              <div className="rule-item">
                <label>Line Height</label>
                <p>{activeVersion.default_line_height || '1.5'}</p>
              </div>
              <div className="rule-item">
                <label>Margin Top</label>
                <p>{activeVersion.page_margin_top || '0'} px</p>
              </div>
              <div className="rule-item">
                <label>Margin Bottom</label>
                <p>{activeVersion.page_margin_bottom || '0'} px</p>
              </div>
              <div className="rule-item">
                <label>Margin Left</label>
                <p>{activeVersion.page_margin_left || '0'} px</p>
              </div>
              <div className="rule-item">
                <label>Margin Right</label>
                <p>{activeVersion.page_margin_right || '0'} px</p>
              </div>
            </div>
          </div>

          {fullTemplateDetails && fullTemplateDetails.sections && (
            <div className="details-card sections-card" style={{ marginTop: 'var(--space-6)' }}>
              <div className="card-header">
                <FiLayers className="header-icon" />
                <h2>Template Sections ({fullTemplateDetails.sections.length})</h2>
              </div>
              <div className="sections-detailed-list">
                {fullTemplateDetails.sections.map((section, index) => (
                  <div key={section.id || index} className="section-detailed-item">
                    <div className="section-detailed-header">
                      <h3>
                        <span className="section-order">{index + 1}.</span> 
                        {section.title}
                      </h3>
                      <div className="section-badges">
                        <span className={`status-badge ${section.is_required ? 'active' : 'inactive'}`}>
                          {section.is_required ? "Required" : "Optional"}
                        </span>
                        <span className="level-badge">Level {section.level || 1}</span>
                      </div>
                    </div>
                    
                    <div className="section-rules-grid">
                      <div className="rule-group">
                        <h4>Title Formatting</h4>
                        <div className="rule-subgrid">
                          <div className="subrule"><span>Size:</span> {section.title_font_size || 'Default'}</div>
                          <div className="subrule"><span>Weight:</span> {section.title_font_weight || 'Default'}</div>
                          <div className="subrule"><span>Align:</span> {section.title_text_align || 'Left'}</div>
                        </div>
                      </div>
                      <div className="rule-group">
                        <h4>Body Formatting</h4>
                        <div className="rule-subgrid">
                          <div className="subrule"><span>Size:</span> {section.body_font_size || 'Default'}</div>
                          <div className="subrule"><span>Weight:</span> {section.body_font_weight || 'Default'}</div>
                          <div className="subrule"><span>Align:</span> {section.body_text_align || 'Left'}</div>
                          <div className="subrule"><span>Line Height:</span> {section.line_height || 'Default'}</div>
                        </div>
                      </div>
                      <div className="rule-group">
                        <h4>Spacing</h4>
                        <div className="rule-subgrid">
                          <div className="subrule"><span>Margin Top:</span> {section.margin_top || '0'} px</div>
                          <div className="subrule"><span>Margin Bottom:</span> {section.margin_bottom || '0'} px</div>
                          <div className="subrule"><span>Padding Left:</span> {section.padding_left || '0'} px</div>
                        </div>
                      </div>
                    </div>
                    
                    {(() => {
                      let blocks = [];
                      try {
                        if (section.seed_blocks) {
                          blocks = typeof section.seed_blocks === 'string' ? JSON.parse(section.seed_blocks) : section.seed_blocks;
                        }
                      } catch(e) {}
                      
                      if (blocks && blocks.length > 0) {
                        return (
                          <div className="section-seed-blocks">
                            <h4>Predefined Content Blocks ({blocks.length})</h4>
                            <div className="seed-blocks-preview">
                              {blocks.map((block, bIdx) => (
                                <div key={bIdx} className="seed-block-item">
                                  <span className="block-type">{block.type}</span>
                                  {block.type === 'paragraph' && (
                                    <span className="block-snippet">{block.content?.substring(0, 60)}{block.content?.length > 60 ? '...' : ''}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TemplateDetails;
