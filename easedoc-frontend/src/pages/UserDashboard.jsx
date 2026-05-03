import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { FiFileText, FiCheckCircle, FiEdit2 } from "react-icons/fi";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./Dashboard.css";

const UserDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/dashboard/user");
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch user stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (!data) return <div>Failed to load dashboard data.</div>;

  const { stats, recentDocuments, docsByStatus } = data;

  const COLORS = ["#f59e0b", "#10b981"]; // Orange for draft, Green for completed

  return (
    <div className="dashboard-overview">
      <h2 style={{ margin: "0 0 10px 0", color: "var(--text-main)" }}>My Overview</h2>
      
      {/* STAT CARDS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon docs">
            <FiFileText />
          </div>
          <div className="stat-info">
            <h3>Total Documents</h3>
            <p>{stats.totalDocuments}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon users">
            <FiEdit2 />
          </div>
          <div className="stat-info">
            <h3>Drafts</h3>
            <p>{stats.draftDocs}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon templates">
            <FiCheckCircle />
          </div>
          <div className="stat-info">
            <h3>Completed</h3>
            <p>{stats.completedDocs}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-row">
        {/* CHART */}
        <div className="dashboard-card">
          <h3>Documents Status</h3>
          <div style={{ width: "100%", height: 300, minWidth: 0 }}>
            {docsByStatus && docsByStatus.length > 0 && stats.totalDocuments > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={docsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {docsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name.toLowerCase() === 'completed' ? COLORS[1] : COLORS[0]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: "#94a3b8", textAlign: "center", paddingTop: "100px" }}>No documents yet</p>
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
                    <p>{doc.template_name}</p>
                  </div>
                  <div className={`activity-status status-${doc.status?.toLowerCase() || 'draft'}`}>
                    {doc.status || "DRAFT"}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: "#94a3b8" }}>No recent documents</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
