import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { FiUsers, FiFileText, FiLayers } from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./Dashboard.css";

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/dashboard/admin");
        setData(res.data);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (!data) return <div>Failed to load dashboard data.</div>;

  const { stats, recentDocuments, docsByType } = data;

  return (
    <div className="dashboard-overview animate-fade-in">
      <div className="dashboard-header">
        <h2>Dashboard Overview</h2>
        <p>Welcome back! Here's what's happening with EaseDoc today.</p>
      </div>

      {/* STAT CARDS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon users">
            <FiUsers />
          </div>
          <div className="stat-info">
            <p>{stats.totalUsers}</p>
            <h3>Total Users</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon templates">
            <FiLayers />
          </div>
          <div className="stat-info">
            <p>{stats.totalTemplates}</p>
            <h3>Total Templates</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon docs">
            <FiFileText />
          </div>
          <div className="stat-info">
            <p>{stats.totalDocuments}</p>
            <h3>Total Documents</h3>
          </div>
        </div>
      </div>

      <div className="dashboard-row">
        {/* CHART */}
        <div className="card">
          <div className="card-header">
            <h3>Documents by Type</h3>
          </div>
          <div className="chart-container">
            {docsByType && docsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={docsByType}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} />
                  <Tooltip
                    cursor={{ fill: "var(--primary-light)" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid var(--border-color)",
                      boxShadow: "var(--shadow-md)",
                      backgroundColor: "var(--bg-card)",
                      color: "var(--text-main)"
                    }}
                  />
                  <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p style={{ color: "var(--text-muted)" }}>No data available</p>
              </div>
            )}
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Documents</h3>
          </div>
          <div className="recent-activity-list">
            {recentDocuments && recentDocuments.length > 0 ? (
              recentDocuments.map((doc) => (
                <div className="activity-item" key={doc.id}>
                  <div className="activity-info">
                    <h4>{doc.title}</h4>
                    <p>{doc.author} • {doc.template_name}</p>
                  </div>
                  <div className={`activity-status status-${doc.status?.toLowerCase().replace(/\s+/g, '-') || "draft"}`}>
                    {doc.status || "DRAFT"}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: "var(--text-muted)", textAlign: "center" }}>No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
