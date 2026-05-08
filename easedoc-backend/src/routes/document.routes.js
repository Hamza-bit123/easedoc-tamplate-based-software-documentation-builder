import express from "express";
import {
  createDocumentController,
  getDocumentController,
  validateDocumentController,
  getUserDocumentsController,
  updateDocumentStatusController,
  updateDocumentTitleController,
} from "../controllers/document.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, createDocumentController);
router.get("/my", verifyToken, getUserDocumentsController);
router.get("/:id", verifyToken, getDocumentController);
router.get("/:id/validate", validateDocumentController);
router.put("/:id/title", verifyToken, updateDocumentTitleController);
router.put("/:id/status", verifyToken, updateDocumentStatusController);

export default router;
