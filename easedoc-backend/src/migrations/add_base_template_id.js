import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Connection failed:", err);
    process.exit(1);
  }
  console.log("Connected to DB");

  const sql = "ALTER TABLE templates ADD COLUMN base_template_id INT DEFAULT NULL";
  db.query(sql, (err) => {
    if (err) {
      if (err.code === "ER_DUP_COLUMN_NAME") {
        console.log("Column already exists");
      } else {
        console.error("Migration failed:", err);
        process.exit(1);
      }
    } else {
      console.log("Column base_template_id added successfully");
    }
    
    // Add foreign key constraint for cascading delete
    const fkSql = "ALTER TABLE templates ADD CONSTRAINT fk_base_template FOREIGN KEY (base_template_id) REFERENCES templates(id) ON DELETE CASCADE";
    db.query(fkSql, (err) => {
        if (err) {
            console.log("Constraint might already exist or failed:", err.message);
        } else {
            console.log("Cascading foreign key added");
        }
        db.end();
        process.exit(0);
    });
  });
});
