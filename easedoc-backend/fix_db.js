import db from "./src/config/db.js";

async function run() {
  try {
    await db.promise().query("ALTER TABLE document_sections DROP FOREIGN KEY document_sections_ibfk_2;");
    console.log("Foreign key dropped successfully.");
  } catch (err) {
    console.error("Error dropping foreign key:", err);
  }
  process.exit();
}

run();
