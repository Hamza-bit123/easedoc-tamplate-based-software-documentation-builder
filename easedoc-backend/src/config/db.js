import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import mysql from "mysql2";

const requiredDbEnvVars = [
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
];

const missingDbEnvVars = requiredDbEnvVars.filter((key) => !process.env[key]);
if (missingDbEnvVars.length > 0) {
  console.error(
    `Database configuration error. Missing: ${missingDbEnvVars.join(", ")}`,
  );
  process.exit(1);
}

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("Database pool connection failed:", err.message);
    process.exit(1);
  } else {
    connection.release();
    console.log("Connected to MySQL database");
  }
});

export default db;
