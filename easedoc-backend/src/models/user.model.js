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
