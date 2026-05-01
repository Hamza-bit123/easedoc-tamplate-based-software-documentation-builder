import React, { useContext } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  MdOutlineDashboard,
  MdOutlineLayers,
  MdOutlinePostAdd,
} from "react-icons/md";
import { FiUsers, FiSettings, FiFileText } from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi2";
import "./sidebar.css";
import { AuthContext } from "../context/AuthContext";

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const role = user?.role;
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
        path: "user/documents",
        label: "My Documents",
        icon: <FiFileText size={22} />,
      },
      {
        path: "user/templates",
        label: "My Templates",
        icon: <MdOutlineLayers size={22} />,
      },
      {
        path: "user/documents/create",
        label: "Create Document",
        icon: <MdOutlinePostAdd size={24} />,
      },
    ],
  };

  const currentMenu = menuItems[role] || menuItems.user;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">
          <HiOutlineSparkles size={28} />
        </div>
        <h2 className="brand-text">EasDoc</h2>
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
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <Link
            onClick={() => {
              logout();
            }}
          >
            LogOut
          </Link>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
