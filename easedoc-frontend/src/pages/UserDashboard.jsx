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
import EasDocLoader from "../components/EasDocLoader";

const UserDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/dashboard/user");
        setData(res.data);
      } catch {
        // Error handled by UI
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <EasDocLoader message="Loading your workspace..." />
  );
  
  if (!data) return <div className="text-center p-20">Failed to load dashboard data.</div>;

  const { stats, recentDocuments, docsByStatus } = data;

  // Use variables for chart colors
  const COLORS = {
    completed: "var(--success)",
    draft: "var(--warning)"
  };

  return (
    <div className="dashboard-overview animate-fade-in">
      <div className="dashboard-header">
        <h2>My Overview</h2>
        <p>Welcome back! Here's a summary of your workspace.</p>
      </div>

      {/* STAT CARDS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon docs">
            <FiFileText />
          </div>
          <div className="stat-info">
            <p>{stats.totalDocuments}</p>
            <h3>Total Documents</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon users">
            <FiEdit2 />
          </div>
          <div className="stat-info">
            <p>{stats.draftDocs}</p>
            <h3>Drafts</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon templates">
            <FiCheckCircle />
          </div>
          <div className="stat-info">
            <p>{stats.completedDocs}</p>
            <h3>Completed</h3>
          </div>
        </div>
      </div>

      <div className="dashboard-row">
        {/* CHART */}
        <div className="card">
          <div className="card-header">
            <h3>Documents Status</h3>
          </div>
          <div className="chart-container flex items-center justify-center">
            {docsByStatus &&
            docsByStatus.length > 0 &&
            stats.totalDocuments > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={docsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="count"
                    stroke="none"
                  >
                    {docsByStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.name.toLowerCase() === "completed"
                            ? COLORS.completed
                            : COLORS.draft
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid var(--border-color)",
                      boxShadow: "var(--shadow-md)",
                      backgroundColor: "var(--bg-card)",
                      color: "var(--text-main)"
                    }}
                    itemStyle={{ color: "var(--text-main)" }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => <span style={{ color: 'var(--text-main)', fontSize: '12px', fontWeight: 600 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: "var(--text-muted)" }}>No documents yet</p>
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
                    <p>{doc.template_name}</p>
                  </div>
                  <div className={`activity-status status-${doc.status?.toLowerCase().replace(/\s+/g, '-') || "draft"}`}>
                    {doc.status || "DRAFT"}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: "var(--text-muted)", textAlign: "center" }}>No recent documents</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
