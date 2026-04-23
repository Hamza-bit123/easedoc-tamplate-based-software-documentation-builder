import express from "express";
import {
  exportPDFController,
  exportWordController,
} from "../controllers/export.controller.js";

const router = express.Router();

router.post("/pdf", exportPDFController);
router.get("/word/:id", exportWordController);

export default router;
