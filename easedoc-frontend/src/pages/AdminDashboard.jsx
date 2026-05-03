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
        console.error("Failed to fetch admin stats", err);
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
    <div className="dashboard-overview">
      <h2 style={{ margin: "0 0 10px 0", color: "var(--text-main)" }}>Overview</h2>
      
      {/* STAT CARDS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon users">
            <FiUsers />
          </div>
          <div className="stat-info">
            <h3>Total Users</h3>
            <p>{stats.totalUsers}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon templates">
            <FiLayers />
          </div>
          <div className="stat-info">
            <h3>Total Templates</h3>
            <p>{stats.totalTemplates}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon docs">
            <FiFileText />
          </div>
          <div className="stat-info">
            <h3>Total Documents</h3>
            <p>{stats.totalDocuments}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-row">
        {/* CHART */}
        <div className="dashboard-card">
          <h3>Documents by Type</h3>
          <div style={{ width: "100%", height: 300, minWidth: 0 }}>
            {docsByType && docsByType.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={docsByType} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(0,0,0,0.05)'}} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="count" fill="#4e7d96" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: "#94a3b8", textAlign: "center", paddingTop: "100px" }}>No chart data available</p>
            )}
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="dashboard-card">
          <h3>Recent Documents</h3>
          <div className="recent-activity-list">
            {recentDocuments && recentDocuments.length > 0 ? (
              recentDocuments.map((doc) => (
                <div className="activity-item" key={doc.id}>
                  <div className="activity-info">
                    <h4>{doc.title}</h4>
                    <p>{doc.author} • {doc.template_name}</p>
                  </div>
                  <div className={`activity-status status-${doc.status?.toLowerCase() || 'draft'}`}>
                    {doc.status || "DRAFT"}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: "#94a3b8" }}>No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
