import db from "./src/config/db.js";

db.query("DESCRIBE templates", (err, res) => {
  console.log("templates", res);
  db.query("DESCRIBE template_versions", (err, res) => {
    console.log("template_versions", res);
    db.query("DESCRIBE standards", (err, res) => {
      console.log("standards", res);
      process.exit();
    });
  });
});
