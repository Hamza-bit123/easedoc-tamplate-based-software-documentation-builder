import db from "../config/db.js";

export const createUser = (user, callback) => {
  const sql = "INSERT INTO users (fullName, email, password) VALUES (?, ?, ?)";
  db.query(sql, [user.fullName, user.email, user.password], callback);
};

export const findUserByEmail = (email, callback) => {
  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], callback);
};

export const upsertPendingUserVerification = (pendingUser, callback) => {
  const sql = `
    INSERT INTO pending_user_verifications
      (fullName, email, password, verification_code, expires_at, resend_available_at, attempts)
    VALUES (?, ?, ?, ?, ?, ?, 0)
    ON DUPLICATE KEY UPDATE
      fullName = VALUES(fullName),
      password = VALUES(password),
      verification_code = VALUES(verification_code),
      expires_at = VALUES(expires_at),
      resend_available_at = VALUES(resend_available_at),
      attempts = 0
  `;

  db.query(
    sql,
    [
      pendingUser.fullName,
      pendingUser.email,
      pendingUser.password,
      pendingUser.verificationCode,
      pendingUser.expiresAt,
      pendingUser.resendAvailableAt,
    ],
    callback,
  );
};

export const findPendingUserVerificationByEmail = (email, callback) => {
  const sql = "SELECT * FROM pending_user_verifications WHERE email = ?";
  db.query(sql, [email], callback);
};

export const incrementPendingVerificationAttempts = (email, callback) => {
  const sql = "UPDATE pending_user_verifications SET attempts = attempts + 1 WHERE email = ?";
  db.query(sql, [email], callback);
};

export const deletePendingUserVerification = (email, callback) => {
  const sql = "DELETE FROM pending_user_verifications WHERE email = ?";
  db.query(sql, [email], callback);
};

export const updateUser = (userId, updates, callback) => {
  const { fullName, email, password } = updates;
  const fields = [];
  const values = [];

  if (fullName !== undefined) {
    fields.push("fullName = ?");
    values.push(fullName);
  }
  if (email !== undefined) {
    fields.push("email = ?");
    values.push(email);
  }
  if (password !== undefined) {
    fields.push("password = ?");
    values.push(password);
  }

  if (fields.length === 0) {
    return callback(null, { affectedRows: 0 });
  }

  values.push(userId);
  const sql = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
  db.query(sql, values, callback);
};

export const createPasswordReset = (data, callback) => {
  const sql = `
    INSERT INTO password_resets (email, token, expires_at)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      token = VALUES(token),
      expires_at = VALUES(expires_at)
  `;
  db.query(sql, [data.email, data.token, data.expiresAt], callback);
};

export const findPasswordResetByEmail = (email, callback) => {
  const sql = "SELECT * FROM password_resets WHERE email = ?";
  db.query(sql, [email], callback);
};

export const findPasswordResetByToken = (token, callback) => {
  const sql = "SELECT * FROM password_resets WHERE token = ?";
  db.query(sql, [token], callback);
};

export const deletePasswordReset = (email, callback) => {
  const sql = "DELETE FROM password_resets WHERE email = ?";
  db.query(sql, [email], callback);
};

