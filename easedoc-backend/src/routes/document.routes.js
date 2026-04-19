import express from "express";
import {
  createDocumentController,
  getDocumentController,
  validateDocumentController,
  getUserDocumentsController,
} from "../controllers/document.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, createDocumentController);
router.get("/my", verifyToken, getUserDocumentsController);
router.get("/:id", verifyToken, getDocumentController);
router.get("/:id/validate", validateDocumentController);

export default router;
