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
  const [showHeader, setShowHeader] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const isEditor = location.pathname.includes("/editor");
    if (!isEditor) {
      setShowHeader(true);
      return;
    }

    setShowHeader(true); // Always show on route change

    // Retry finding the scroller since it mounts after layout
    let scroller = null;
    let lastScrollY = 0;

    const handleScroll = () => {
      const currentScrollY = scroller.scrollTop;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setShowHeader(false);
      } else if (currentScrollY < lastScrollY) {
        setShowHeader(true);
      }
      lastScrollY = currentScrollY;
    };

    const attach = () => {
      scroller = document.querySelector(".main-container");
      if (!scroller) return false;
      lastScrollY = scroller.scrollTop;
      scroller.addEventListener("scroll", handleScroll, { passive: true });
      return true;
    };

    if (!attach()) {
      // If not ready yet, try after next paint
      const raf = requestAnimationFrame(() => attach());
      return () => cancelAnimationFrame(raf);
    }

    return () => {
      if (scroller) scroller.removeEventListener("scroll", handleScroll);
    };
  }, [location.pathname]);

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
        <div
          className={`smart-header-wrapper${!showHeader ? ' header-hidden' : ''}`}
          style={{ overflow: 'hidden' }}
        >
          <Header user={user} toggleSidebar={toggleSidebar} />
        </div>

        <main className={`main-container ${isEditor ? 'editor-mode' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
