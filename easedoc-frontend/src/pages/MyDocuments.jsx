import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiFileText, FiCalendar, FiArrowRight, FiPlus } from "react-icons/fi";
import api from "../api/axios";
import "./MyDocuments.css";

const MyDocuments = () => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      const res = await api.get("/documents/my");
      setDocs(res.data);
    } catch {
      // Error loading documents
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeTime = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return "Just now";

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;

    return past.toLocaleDateString(); // Fallback to date for older docs
  };

  if (loading)
    return (
      <div className="status-container">
        <div className="loader"></div>
        <p>Fetching your documents...</p>
      </div>
    );

  return (
    <div className="docs-page-wrapper">
      <header className="docs-header">
        <div className="header-info">
          <h2>My Documents</h2>
          <p>{docs.length} saved documents found</p>
        </div>
        <button
          className="create-btn"
          onClick={() => navigate("/user/documents/create")}
        >
          <FiPlus /> New Document
        </button>
      </header>

      {docs.length === 0 ? (
        <div className="empty-state">
          <FiFileText size={48} />
          <h3>No documents yet</h3>
          <p>Start your first project by selecting a template.</p>
          <button className="get-started-btn" onClick={() => navigate("/user/documents/create")}>
            Get Started
          </button>
        </div>
      ) : (
        <div className="docs-grid">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="doc-card"
              onClick={() => navigate(`/editor/${doc.id}`)}
            >
              <div className="doc-icon-wrapper">
                <FiFileText className="main-icon" />
              </div>

              <div className="doc-content">
                <h3 title={doc.title}>{doc.title}</h3>
                <span className="template-badge">{doc.template_name}</span>

                <div className="doc-footer">
                  <div className="doc-meta">
                    <FiCalendar />
                    <span>updated {formatRelativeTime(doc.updated_at)}</span>
                  </div>
                  <div className="action-indicator">
                    <FiArrowRight />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyDocuments;
