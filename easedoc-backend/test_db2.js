import db from "./src/config/db.js";

db.query("SELECT * FROM documents LIMIT 5", (err, d) => {
  console.log("Documents:", d);
  db.query("SELECT * FROM document_sections LIMIT 5", (err, ds) => {
    console.log("Document sections:", ds);
    process.exit();
  });
});
