import express from "express";
import {
  createTemplateController,
  getTemplatesByTypeController,
  getTemplateWithSectionsController,
  getTemplateSpecificVersionController,
  updateTemplateController,
  getTemplateDetailsController,
  getTemplateUsageController,
  deleteTemplateController,
  customizeTemplateController,
  getUserCustomizedTemplatesController,
} from "../controllers/template.controller.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, createTemplateController);
router.get("/type/:typeId", verifyToken, getTemplatesByTypeController);
router.get("/:id/details", getTemplateDetailsController);
router.get("/:id/usage", verifyToken, getTemplateUsageController);
router.get("/:id/full", getTemplateWithSectionsController);
router.get("/:id/version/:versionId/full", getTemplateSpecificVersionController);
router.put("/:id", updateTemplateController);
router.delete("/:id", verifyToken, deleteTemplateController); // Allow users to delete their own too

// Customization routes
router.post("/:id/customize", verifyToken, customizeTemplateController);
router.get("/user/customized", verifyToken, getUserCustomizedTemplatesController);

export default router;
