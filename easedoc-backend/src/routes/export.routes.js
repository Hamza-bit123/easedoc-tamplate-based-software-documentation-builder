import express from "express";
import {
  exportPDFController,
  exportWordController,
} from "../controllers/export.controller.js";

const router = express.Router();

router.post("/pdf", exportPDFController);
router.post("/word", exportWordController);

export default router;
