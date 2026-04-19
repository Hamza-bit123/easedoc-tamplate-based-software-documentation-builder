import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  if (docs.length === 0) return <p>No documents found</p>;

  return (
    <div className="docs">
      {docs.map((doc) => (
        <div
          key={doc.id}
          className="doc-card"
          onClick={() => navigate(`/editor/${doc.id}`)}
        >
          <h3>{doc.title}</h3>
          <p>{doc.template_name}</p>
        </div>
      ))}
    </div>
  );
};

export default MyDocuments;
