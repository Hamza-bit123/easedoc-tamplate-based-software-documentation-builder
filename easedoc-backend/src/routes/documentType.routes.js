import express from "express";
import { getDocumentTypesController } from "../controllers/documentType.controller.js";

const router = express.Router();

router.get("/", getDocumentTypesController);

export default router;
