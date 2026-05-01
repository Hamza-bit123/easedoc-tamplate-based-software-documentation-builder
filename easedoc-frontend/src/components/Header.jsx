import React, { useState } from "react";
import { LuSun, LuMoon } from "react-icons/lu";
import "./Header.css";

const Header = ({ user }) => {
  const [isDark, setIsDark] = useState(false);

  const { fullName } = user;
  const name = fullName?.split(" ")[0] || "User";

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.body.setAttribute("data-theme", newTheme ? "dark" : "light");
  };

  return (
    <header className="top-header">
      <div className="welcome-section">
        <h1>Welcome {name} !</h1>
      </div>

      <div className="header-actions">
        {/* Capsule Theme Toggle */}
        <div className="theme-capsule" onClick={toggleTheme}>
          <LuSun className={`toggle-icon ${!isDark ? "visible" : ""}`} />
          <LuMoon className={`toggle-icon ${isDark ? "visible" : ""}`} />
          <div className={`capsule-dot ${isDark ? "right" : "left"}`}></div>
        </div>

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
