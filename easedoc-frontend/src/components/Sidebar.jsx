import React, { useContext, useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  MdOutlineDashboard,
  MdOutlineLayers,
  MdOutlinePostAdd,
} from "react-icons/md";
import { FiUsers, FiSettings, FiFileText, FiLogOut, FiX } from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi2";
import { LuSun, LuMoon } from "react-icons/lu";
import "./Sidebar.css";
import { AuthContext } from "../context/AuthContext";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);
  const role = user?.role;

  const [isDark, setIsDark] = useState(
    document.body.getAttribute("data-theme") === "dark"
  );

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.body.setAttribute("data-theme", newTheme ? "dark" : "light");
  };

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavClick = () => {
    if (window.innerWidth <= 768 && isOpen && toggleSidebar) {
      toggleSidebar();
    }
  };
  // Navigation configurations
  const menuItems = {
    admin: [
      {
        path: "/admin",
        label: "Overview",
        icon: <MdOutlineDashboard size={22} />,
      },
      {
        path: "/admin/templates",
        label: "Templates",
        icon: <MdOutlineLayers size={22} />,
      },
      { path: "/admin/users", label: "Users", icon: <FiUsers size={22} /> },
      {
        path: "/admin/settings",
        label: "Settings",
        icon: <FiSettings size={22} />,
      },
    ],
    user: [
      {
        path: "/user",
        label: "Overview",
        icon: <MdOutlineDashboard size={22} />,
      },
      {
        path: "/user/documents",
        label: "My Documents",
        icon: <FiFileText size={22} />,
      },
      {
        path: "/user/templates",
        label: "My Templates",
        icon: <MdOutlineLayers size={22} />,
      },
      {
        path: "/user/documents/create",
        label: "Create Document",
        icon: <MdOutlinePostAdd size={24} />,
      },
    ],
  };

  const currentMenu = menuItems[role] || menuItems.user;

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-brand">
        <div className="brand-wrapper" style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          <div className="brand-icon">
            <HiOutlineSparkles size={28} />
          </div>
          <h2 className="brand-text">EasDoc</h2>
        </div>
        <button className="sidebar-close-btn" onClick={toggleSidebar}>
          <FiX size={24} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-group">
          <p className="nav-label">
            {role === "admin" ? "Administration" : "Workspace"}
          </p>
          {currentMenu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path.split("/").length <= 2}
              onClick={handleNavClick}
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item" onClick={toggleTheme}>
          <span className="icon">
            {isDark ? <LuSun size={22} /> : <LuMoon size={22} />}
          </span>
          <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
        </button>

        <div className="sidebar-profile-container" ref={profileRef}>
          <button 
            className="nav-item profile-trigger" 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <div className="sidebar-avatar">
              {user?.fullName?.charAt(0).toUpperCase() || "U"}
            </div>
            <span>Profile</span>
          </button>

          {isProfileOpen && (
            <div className="sidebar-profile-dropdown animate-fade-in">
              <Link 
                to="/profile" 
                className="dropdown-item"
                onClick={() => setIsProfileOpen(false)}
              >
                <FiSettings size={18} /> Edit Profile
              </Link>
              <button 
                className="dropdown-item logout-text" 
                onClick={() => {
                  setIsProfileOpen(false);
                  logout();
                }}
              >
                <FiLogOut size={18} /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
