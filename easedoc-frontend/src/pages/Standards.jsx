import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../api/axios";
import toast from "react-hot-toast";

const Standards = () => {
  const { typeId } = useParams();
  const [standards, setStandards] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStandards = async () => {
      try {
        const res = await api.get(`/templates/type/${typeId}`);
        setStandards(res.data);
      } catch (err) {
        console.error("Failed to load standards" + err);
      }
    };

    fetchStandards();
  }, [typeId]);

  const createDocument = async (standardId) => {
    const title = prompt("Enter document title:");
    if (!title) return;

    try {
      const res = await api.post("/documents", {
        title,
        template_id: standardId,
      });

      navigate(`/editor/${res.data.documentId}`);
      toast.success("Document created successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create document.");
    }
  };

  return (
    <Layout>
      <h2>Select Standard</h2>

      {standards.length === 0 && <p>No standards found</p>}

      {standards.map((std) => (
        <div
          key={std.id}
          style={{
            border: "1px solid #ccc",
            padding: "15px",
            marginBottom: "10px",
          }}
        >
          <h3>{std.name}</h3>
          <p>{std.description}</p>

          <button onClick={() => createDocument(std.id)}>
            Use This Standard
          </button>
        </div>
      ))}
    </Layout>
  );
};

export default Standards;
