import React, { useContext, useState, useEffect } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { AuthContext } from "../context/AuthContext";
import "./MainLayout.css";
import EasDocLoader from "./EasDocLoader";

const MainLayout = () => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (loading) return <EasDocLoader message="Initializing system environment..." />;
  if (!user) return <Navigate to="/login" />;

  const isEditor = location.pathname.includes("/editor");

  return (
    <div className={`app-layout ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && window.innerWidth <= 768 && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="main-wrapper">
        {isEditor && (
          <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
            <FiMenu size={24} />
          </button>
        )}
        {!isEditor && <Header user={user} toggleSidebar={toggleSidebar} />}

        <main className={`main-container ${isEditor ? 'editor-mode' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
