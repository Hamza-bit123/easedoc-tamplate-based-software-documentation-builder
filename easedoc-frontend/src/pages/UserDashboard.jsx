// import { useState, useEffect } from "react";
// import api from "../api/axios";
// import "./UserDashboard.css";
// import { useNavigate } from "react-router-dom";

// const UserDashboard = () => {
//   const [types, setTypes] = useState([]);
//   const [selectedType, setSelectedType] = useState(null);
//   const [standards, setStandards] = useState([]);
//   const [selectedStandard, setSelectedStandard] = useState(null);
//   const [templates, setTemplates] = useState([]);
//   const navigate = useNavigate();

//   // fetch standards
//   const fetchStandards = async (typeId) => {
//     try {
//       const res = await api.get(`/standards/type/${typeId}`);
//       setStandards(res.data);
//       setTemplates([]);
//       setSelectedStandard(null);
//     } catch (err) {
//       console.error(err);
//       setStandards([]);
//     }
//   };

//   // fetch templates
//   const fetchTemplates = async (typeId, standardId) => {
//     try {
//       const res = await api.get(
//         `/templates/type/${typeId}?standard_id=${standardId}`,
//       );
//       setTemplates(res.data);
//     } catch (err) {
//       console.error(err);
//       setTemplates([]);
//     }
//   };

//   const use_template = async (templateId) => {
//     try {
//       const res = await api.post("/documents", {
//         template_id: templateId,
//         title: "New Document",
//       });

//       const documentId = res.data.documentId;

//       navigate(`/editor/${documentId}`);
//     } catch (err) {
//       console.error("CREATE DOC ERROR:", err);
//       alert("Failed to create document");
//     }
//   };

//   useEffect(() => {
//     const fetchTypes = async () => {
//       try {
//         const res = await api.get("/document-types");
//         setTypes(res.data);
//       } catch (err) {
//         console.error(err);
//       }
//     };

//     fetchTypes();
//   }, []);

//   return (
//     <div className="dashboard">
//       <h1>Start New Document</h1>

//       <div className="card">
//         <h2>Select Document Type</h2>

//         <div className="grid">
//           {types.map((t) => (
//             <div
//               key={t.id}
//               className={`box ${selectedType === t.id ? "active" : ""}`}
//               onClick={() => {
//                 setSelectedType(t.id);
//                 fetchStandards(t.id);
//               }}
//             >
//               {t.name}
//             </div>
//           ))}
//         </div>
//       </div>

//       {selectedType && (
//         <div className="card">
//           <h2>Select Standard</h2>

//           {standards.length === 0 ? (
//             <p className="empty">No standards available</p>
//           ) : (
//             <div className="grid">
//               {standards.map((s) => (
//                 <div
//                   key={s.id}
//                   className={`box ${selectedStandard === s.id ? "active" : ""}`}
//                   onClick={() => {
//                     setSelectedStandard(s.id);
//                     fetchTemplates(selectedType, s.id);
//                   }}
//                 >
//                   <h3>{s.name}</h3>
//                   <p>{s.description}</p>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       )}

//       {selectedStandard && (
//         <div className="card">
//           <h2>Available Templates</h2>

//           {templates.length === 0 ? (
//             <p className="empty">No templates found</p>
//           ) : (
//             <div className="grid">
//               {templates.map((t) => (
//                 <div key={t.id} className="template-card">
//                   <h3>{t.name}</h3>
//                   <p>{t.description}</p>

//                   <button className="btn" onClick={() => use_template(t.id)}>
//                     Use Template
//                   </button>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// export default UserDashboard;

// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import api from "../api/axios";
// import "./UserDashboard.css";

// const UserDashboard = () => {
//   const navigate = useNavigate();

//   const [documents, setDocuments] = useState([]);
//   const [loadingDocs, setLoadingDocs] = useState(true);

//   useEffect(() => {
//     loadDocuments();
//   }, []);

//   const loadDocuments = async () => {
//     try {
//       const res = await api.get("/documents/my");
//       setDocuments(res.data);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoadingDocs(false);
//     }
//   };

//   return (
//     <div className="dashboard">
//       <h2>Your Documents</h2>

//       {loadingDocs ? (
//         <p>Loading...</p>
//       ) : documents.length === 0 ? (
//         <p className="empty">No documents yet</p>
//       ) : (
//         <div className="doc-list">
//           {documents.map((doc) => (
//             <div
//               key={doc.id}
//               className="doc-card"
//               onClick={() => navigate(`/editor/${doc.id}`)}
//             >
//               <h3>{doc.title}</h3>
//               <p>{doc.template_name}</p>
//               <span>{new Date(doc.created_at).toLocaleDateString()}</span>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default UserDashboard;

import { Link, Outlet } from "react-router-dom";
import "./UserDashboard.css";

const UserDashboard = () => {
  return (
    <div className="layout">
      <aside className="sidenav">
        <h2>EASEDOC</h2>

        <nav>
          <Link to="/dashboard/documents">My Documents</Link>
          <Link to="/dashboard/create">New Document</Link>
        </nav>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default UserDashboard;
