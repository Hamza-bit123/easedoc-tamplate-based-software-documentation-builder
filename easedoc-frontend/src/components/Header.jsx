import React, { useState, useRef, useEffect, useContext } from "react";
import { FiMenu, FiSidebar, FiSettings, FiLogOut, FiChevronDown } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./Header.css";

const Header = ({ user, toggleSidebar }) => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { fullName } = user;
  const name = fullName?.split(" ")[0] || "User";

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="top-header">
      <div className="header-left-section">
        {toggleSidebar && (
          <button className="header-sidebar-toggle" onClick={toggleSidebar} title="Toggle Sidebar">
            <FiSidebar size={24} className="desktop-icon" />
            <FiMenu size={24} className="mobile-icon" />
          </button>
        )}
        <div className="welcome-section">
          <h1>Welcome {name} !</h1>
        </div>
      </div>

      <div className="header-actions">

        {/* Profile Section */}
        <div className="header-profile-container" ref={profileRef}>
          <div 
            className="user-profile-capsule" 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            style={{ cursor: "pointer" }}
          >
            <span className="avator">{name?.charAt(0).toUpperCase() || "U"}</span>
            <span className="user-display-name">{name}</span>
            <FiChevronDown size={16} style={{ marginLeft: "4px" }} />
          </div>

          {isProfileOpen && (
            <div className="header-profile-dropdown animate-fade-in">
              <Link 
                to="/profile" 
                className="dropdown-item"
                onClick={() => setIsProfileOpen(false)}
              >
                <FiSettings size={18} /> Profile
              </Link>
              <button 
                className="dropdown-item logout-text" 
                onClick={() => {
                  setIsProfileOpen(false);
                  logout();
                  navigate("/");
                }}
              >
                <FiLogOut size={18} /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
