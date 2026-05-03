import React, { useContext } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { AuthContext } from "../context/AuthContext";
import "./MainLayout.css";

const MainLayout = () => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  const isEditor = location.pathname.includes("/editor");

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-wrapper">
        {!isEditor && <Header user={user} />}

        <main className={`main-container ${isEditor ? 'editor-mode' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
