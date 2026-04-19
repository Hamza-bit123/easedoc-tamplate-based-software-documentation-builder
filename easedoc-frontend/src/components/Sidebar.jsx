import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Sidebar = () => {
  const { user } = useContext(AuthContext);

  return (
    <div
      style={{
        width: "220px",
        background: "#1e293b",
        color: "white",
        height: "100vh",
        padding: "20px",
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>EASEDOC</h2>

      {/* Common */}
      <Link to="/" style={linkStyle}>
        Dashboard
      </Link>

      {user?.role === "admin" ? (
        <>
          <Link to="/admin/templates" style={linkStyle}>
            Manage Templates
          </Link>
        </>
      ) : (
        <>
          <Link to="/my-documents" style={linkStyle}>
            My Documents
          </Link>
        </>
      )}
    </div>
  );
};

const linkStyle = {
  display: "block",
  marginBottom: "10px",
  color: "white",
  textDecoration: "none",
};

export default Sidebar;
