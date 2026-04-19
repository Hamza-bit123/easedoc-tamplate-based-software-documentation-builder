import express from "express";
import {
  saveSectionController,
  getSectionsController,
} from "../controllers/documentSection.controller.js";

const router = express.Router();

router.post("/save", saveSectionController);
router.get("/:documentId", getSectionsController);

export default router;
