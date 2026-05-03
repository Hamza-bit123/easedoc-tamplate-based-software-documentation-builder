import db from "./src/config/db.js";

db.query("SELECT * FROM templates WHERE id = 13", (err, t) => {
  console.log("Template:", t);
  db.query("SELECT * FROM template_versions WHERE template_id = 13", (err, v) => {
    console.log("Versions:", v);
    process.exit();
  });
});
