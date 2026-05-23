import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiFileText, FiCalendar, FiArrowRight, FiPlus, FiPenTool, FiTrash2 } from "react-icons/fi";
import api from "../api/axios";
import "./MyDocuments.css";
import toast from "react-hot-toast";
import { usePopup } from "../context/PopupContext";
import EasDocLoader from "../components/EasDocLoader";

const MyDocuments = () => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showPopup } = usePopup();

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

  const deleteDocument = (doc, event) => {
    event.stopPropagation();
    showPopup({
      type: "warning",
      title: "Delete Document",
      message: "Are you sure you want to delete this document? This action cannot be undone.",
      confirmText: "Delete",
      onConfirm: () => {
        setDocs((currentDocs) => currentDocs.filter((d) => d.id !== doc.id));
        
        let isUndone = false;

        const toastId = toast.custom((t) => (
          <div className={`undo-toast ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
            <div className="undo-toast-content">
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                Deleting "{doc.title}"...
              </span>
              <button 
                className="undo-btn" 
                onClick={() => {
                  isUndone = true;
                  toast.dismiss(t.id);
                  setDocs((currentDocs) => {
                    const newDocs = [...currentDocs, doc];
                    return newDocs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                  });
                }}
              >
                Undo
              </button>
            </div>
            <div className="undo-progress-bar"></div>
          </div>
        ), { duration: 5000 });

        setTimeout(async () => {
          if (!isUndone) {
            toast.dismiss(toastId);
            try {
              await api.delete(`/documents/${doc.id}`);
            } catch (err) {
              toast.error(err.response?.data?.message || "Failed to delete document.");
              setDocs((currentDocs) => {
                const newDocs = [...currentDocs, doc];
                return newDocs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
              });
            }
          }
        }, 5000);
      },
    });
  };

  const renameDocument = (doc, event) => {
    event.stopPropagation();
    showPopup({
      type: "info",
      title: "Rename Document",
      message: "Update the name shown in your document list.",
      showInput: true,
      initialValue: doc.title,
      placeholder: "Document name",
      confirmText: "Save Name",
      onConfirm: async (title) => {
        const cleanTitle = title?.trim();
        if (!cleanTitle) {
          toast.error("Document name is required.");
          return;
        }

        try {
          await api.put(`/documents/${doc.id}/title`, { title: cleanTitle });
          setDocs((currentDocs) =>
            currentDocs.map((item) =>
              item.id === doc.id ? { ...item, title: cleanTitle } : item,
            ),
          );
          toast.success("Document renamed.");
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to rename document.");
        }
      },
    });
  };

  if (loading)
    return (
      <EasDocLoader message="Fetching your documents..." />
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
                <div className="doc-title-row">
                  <h3 title={doc.title}>{doc.title}</h3>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                      className="rename-doc-btn"
                      title="Rename document"
                      onClick={(event) => renameDocument(doc, event)}
                    >
                      <FiPenTool size={13} />
                    </button>
                    <button
                      className="delete-doc-btn"
                      title="Delete document"
                      onClick={(event) => deleteDocument(doc, event)}
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
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
