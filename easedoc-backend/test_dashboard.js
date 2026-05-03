import db from "./src/config/db.js";
import { getAdminDashboardStats, getUserDashboardStats } from "./src/services/dashboard.service.js";

async function test() {
  try {
    const adminStats = await getAdminDashboardStats();
    console.log("Admin Stats:", JSON.stringify(adminStats, null, 2));

    const userStats = await getUserDashboardStats(1);
    console.log("User Stats:", JSON.stringify(userStats, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit();
}

test();
