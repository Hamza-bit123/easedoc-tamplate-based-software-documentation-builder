import express from "express";
import {
  register,
  login,
  getAllUsers,
  updateUserRole,
  deleteUser,
  verifyEmailCode,
  resendVerificationCode,
  updateProfile,
} from "../controllers/user.controller.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-email", verifyEmailCode);
router.post("/resend-verification-code", resendVerificationCode);
router.post("/login", login);

// Profile routes
router.put("/profile", verifyToken, updateProfile);

// Admin routes
router.get("/", verifyToken, isAdmin, getAllUsers);
router.put("/:id/role", verifyToken, isAdmin, updateUserRole);
router.delete("/:id", verifyToken, isAdmin, deleteUser);

export default router;
