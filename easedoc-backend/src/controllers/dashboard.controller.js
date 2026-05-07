import { getAdminDashboardStats, getUserDashboardStats } from "../services/dashboard.service.js";

export const getAdminOverview = async (req, res) => {
  try {
    const data = await getAdminDashboardStats();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch admin stats" });
  }
};

export const getUserOverview = async (req, res) => {
  try {
    const data = await getUserDashboardStats(req.user.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user stats" });
  }
};
