import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: "#f1f5f9",
        padding: "10px 20px",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <h3>Welcome, {user?.fullName}</h3>

      <button
        onClick={() => {
          logout();
          navigate("/login");
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default Navbar;
