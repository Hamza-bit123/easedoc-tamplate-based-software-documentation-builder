import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiFileText, FiCalendar, FiArrowRight, FiPlus, FiPenTool, FiTrash2, FiSearch, FiFilter, FiChevronLeft, FiChevronRight } from "react-icons/fi";
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

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [docTypeId, setDocTypeId] = useState("");
  const [standardId, setStandardId] = useState("");

  const [docTypes, setDocTypes] = useState([]);
  const [standards, setStandards] = useState([]);

  useEffect(() => {
    api.get("/document-types").then(res => setDocTypes(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (docTypeId) {
      api.get(`/standards/${docTypeId}`).then(res => setStandards(res.data)).catch(console.error);
    } else {
      setStandards([]);
      setStandardId("");
    }
  }, [docTypeId]);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/documents/my", {
        params: { page, limit, search, docTypeId, standardId }
      });
      setDocs(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalItems(res.data.total || 0);
    } catch {
      // Error loading documents
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, docTypeId, standardId]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadDocs();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [loadDocs]);

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
      <EasDocLoader message="Fetching your documents" />
    );

  return (
    <div className="docs-page-wrapper">
      <header className="docs-header">
        <div className="header-info">
          <h2>My Documents</h2>
          <p>{totalItems} saved documents found</p>
        </div>
        <button
          className="create-btn"
          onClick={() => navigate("/user/documents/create")}
        >
          <FiPlus /> New Document
        </button>
      </header>

      <div className="docs-filters-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
          <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by name..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
          />
        </div>
        
        <div className="filter-selects" style={{ display: 'flex', gap: '1rem' }}>
          <select 
            value={docTypeId} 
            onChange={(e) => { setDocTypeId(e.target.value); setPage(1); }}
            style={{ padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', minWidth: '150px' }}
          >
            <option value="">All Types</option>
            {docTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>

          <select 
            value={standardId} 
            onChange={(e) => { setStandardId(e.target.value); setPage(1); }}
            disabled={!docTypeId}
            style={{ padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', minWidth: '150px' }}
          >
            <option value="">All Standards</option>
            {standards.map(std => (
              <option key={std.id} value={std.id}>{std.name}</option>
            ))}
          </select>
        </div>
      </div>


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

      {totalPages > 1 && (
        <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{ padding: '8px 12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: 'var(--radius-md)', cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <FiChevronLeft /> Previous
          </button>
          <span style={{ color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
          <button 
            disabled={page === totalPages} 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            style={{ padding: '8px 12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: 'var(--radius-md)', cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Next <FiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
};

export default MyDocuments;
