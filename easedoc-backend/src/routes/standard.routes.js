import express from "express";
import { getStandardsByTypeController } from "../controllers/standard.controller.js";

const router = express.Router();

router.get("/:typeId", getStandardsByTypeController);

export default router;
