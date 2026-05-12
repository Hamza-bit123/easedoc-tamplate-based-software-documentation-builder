import React from "react";
import { FiMenu, FiSidebar } from "react-icons/fi";
import "./Header.css";

const Header = ({ user, toggleSidebar }) => {
  const { fullName } = user;
  const name = fullName?.split(" ")[0] || "User";

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
        <div className="user-profile-capsule">
          <span className="avator">{name?.split("").slice(0, 1)}</span>
          <span className="user-display-name">{name}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
