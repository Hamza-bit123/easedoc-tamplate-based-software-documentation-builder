import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import { verifyToken } from "./middlewares/auth.middleware.js";
import express from "express";
import cors from "cors";
import "./config/db.js";
import userRoutes from "./routes/user.routes.js";
import templateRoutes from "./routes/template.routes.js";
import standardRoutes from "./routes/standard.routes.js";
import documentTypeRoutes from "./routes/documentType.routes.js";
import documentSectionRoutes from "./routes/documentSection.routes.js";
import documentRoutes from "./routes/document.routes.js";
import exportRoutes from "./routes/export.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.json({ limit: "10mb" }));

app.use("/api/users", userRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/standards", standardRoutes);
app.use("/api/document-types", documentTypeRoutes);
app.use("/api/document-sections", documentSectionRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/dashboard", dashboardRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get("/api/protected", verifyToken, (req, res) => {
  res.json({
    message: "Protected route accessed",
    user: req.user,
  });
});
