import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";
import { usePopup } from "../context/PopupContext";
import "./Standards.css";

const Standards = () => {
  const { typeId } = useParams();
  const [standards, setStandards] = useState([]);
  const navigate = useNavigate();
  const { showPopup } = usePopup();

  useEffect(() => {
    const fetchStandards = async () => {
      try {
        const res = await api.get(`/templates/type/${typeId}`);
        setStandards(res.data);
      } catch {
        // Error loading standards
      }
    };

    fetchStandards();
  }, [typeId]);

  const createDocument = (standardId) => {
    showPopup({
      type: 'info',
      title: 'New Document',
      message: 'Enter a title for your new document:',
      showInput: true,
      placeholder: 'e.g. My Technical Report',
      confirmText: 'Create Document',
      onConfirm: async (title) => {
        if (!title) {
          toast.error("Title is required.");
          return;
        }

        try {
          const res = await api.post("/documents", {
            title,
            template_id: standardId,
          });

          navigate(`/editor/${res.data.documentId}`);
          toast.success("Document created successfully!");
        } catch {
          toast.error("Failed to create document.");
        }
      }
    });
  };

  return (
    <div className="standards-page">
      <h2>Select Standard</h2>

      {standards.length === 0 ? (
        <p className="no-standards">No standards found for this type.</p>
      ) : (
        <div className="standards-grid">
          {standards.map((std) => (
            <div key={std.id} className="standard-card">
              <h3>{std.name}</h3>
              <p>{std.description || "No description available for this standard."}</p>
              <button onClick={() => createDocument(std.id)}>
                Use This Standard
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Standards;
