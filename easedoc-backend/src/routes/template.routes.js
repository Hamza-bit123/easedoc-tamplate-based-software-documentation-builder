import express from "express";
import {
  createTemplateController,
  getTemplatesByTypeController,
  getTemplateWithSectionsController,
} from "../controllers/template.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, createTemplateController);
router.get("/type/:typeId", getTemplatesByTypeController);
router.get("/:id/full", getTemplateWithSectionsController);

export default router;
