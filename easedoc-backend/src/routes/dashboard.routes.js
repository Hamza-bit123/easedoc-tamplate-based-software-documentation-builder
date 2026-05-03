import express from "express";
import { getAdminOverview, getUserOverview } from "../controllers/dashboard.controller.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/admin", verifyToken, isAdmin, getAdminOverview);
router.get("/user", verifyToken, getUserOverview);

export default router;
