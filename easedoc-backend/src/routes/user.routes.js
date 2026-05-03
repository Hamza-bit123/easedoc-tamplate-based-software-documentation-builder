import express from "express";
import { register, login, getAllUsers, updateUserRole, deleteUser } from "../controllers/user.controller.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Admin routes
router.get("/", verifyToken, isAdmin, getAllUsers);
router.put("/:id/role", verifyToken, isAdmin, updateUserRole);
router.delete("/:id", verifyToken, isAdmin, deleteUser);

export default router;
