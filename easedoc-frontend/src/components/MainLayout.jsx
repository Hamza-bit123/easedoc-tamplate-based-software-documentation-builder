import React, { useContext } from "react";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { AuthContext } from "../context/AuthContext";
import "./MainLayout.css";

const MainLayout = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-wrapper">
        <Header user={user} />

        <main className="main-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
