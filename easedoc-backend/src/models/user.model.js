import db from "../config/db.js";

export const createUser = (user, callback) => {
  const sql = "INSERT INTO users (fullName, email, password) VALUES (?, ?, ?)";
  db.query(sql, [user.fullName, user.email, user.password], callback);
};

export const findUserByEmail = (email, callback) => {
  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], callback);
};
