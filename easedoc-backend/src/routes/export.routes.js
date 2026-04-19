import express from "express";
import { exportPDFController } from "../controllers/export.controller.js";

const router = express.Router();

router.get("/pdf/:id", exportPDFController);

export default router;
