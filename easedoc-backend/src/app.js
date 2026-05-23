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

const requiredEnvVars = [
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "JWT_SECRET",
  "FRONTEND_URL",
];

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`,
  );
  process.exit(1);
}

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/users", userRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/standards", standardRoutes);
app.use("/api/document-types", documentTypeRoutes);
app.use("/api/document-sections", documentSectionRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/dashboard", dashboardRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT);

app.get("/api/protected", verifyToken, (req, res) => {
  res.json({
    message: "Protected route accessed",
    user: req.user,
  });
});
