import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import dns from "node:dns/promises";
import {
  createUser,
  deletePendingUserVerification,
  findPendingUserVerificationByEmail,
  findUserByEmail,
  incrementPendingVerificationAttempts,
  upsertPendingUserVerification,
  updateUser,
} from "../models/user.model.js";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import { sendVerificationCodeEmail } from "./email.service.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const VERIFICATION_CODE_EXPIRES_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFICATION_ATTEMPTS = 5;

const normalizeEmail = (email = "") => email.trim().toLowerCase();
const generateVerificationCode = () => crypto.randomInt(100000, 1000000).toString();
const minutesFromNow = (minutes) => new Date(Date.now() + minutes * 60 * 1000);
const secondsFromNow = (seconds) => new Date(Date.now() + seconds * 1000);

const toMysqlDateTime = (date) => {
  const pad = (value) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + ` ${[
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join(":")}`;
};

const validateEmail = async (email) => {
  if (!EMAIL_PATTERN.test(email)) {
    throw { message: "Please enter a valid email address" };
  }

  const domain = email.split("@")[1];

  try {
    const mxRecords = await dns.resolveMx(domain);

    if (mxRecords.length === 0) {
      throw new Error("No MX records found");
    }
  } catch {
    try {
      await dns.resolve4(domain);
    } catch {
      throw { message: "Email domain does not exist or cannot receive mail" };
    }
  }
};

const findUserByEmailAsync = (email) =>
  new Promise((resolve, reject) => {
    findUserByEmail(email, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

const findPendingUserVerificationByEmailAsync = (email) =>
  new Promise((resolve, reject) => {
    findPendingUserVerificationByEmail(email, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

const createUserAsync = (user) =>
  new Promise((resolve, reject) => {
    createUser(user, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

const upsertPendingUserVerificationAsync = (pendingUser) =>
  new Promise((resolve, reject) => {
    upsertPendingUserVerification(pendingUser, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

const incrementPendingVerificationAttemptsAsync = (email) =>
  new Promise((resolve, reject) => {
    incrementPendingVerificationAttempts(email, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

const deletePendingUserVerificationAsync = (email) =>
  new Promise((resolve, reject) => {
    deletePendingUserVerification(email, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

const createAndSendVerificationCode = async ({ fullName, email, password }) => {
  const code = generateVerificationCode();
  const hashedCode = await bcrypt.hash(code, 10);

  await upsertPendingUserVerificationAsync({
    fullName,
    email,
    password,
    verificationCode: hashedCode,
    expiresAt: toMysqlDateTime(minutesFromNow(VERIFICATION_CODE_EXPIRES_MINUTES)),
    resendAvailableAt: toMysqlDateTime(secondsFromNow(RESEND_COOLDOWN_SECONDS)),
  });

  try {
    await sendVerificationCodeEmail({
      to: email,
      fullName,
      code,
    });
  } catch (emailErr) {
    await deletePendingUserVerificationAsync(email);
    throw emailErr;
  }
};

export const registerUser = async (userData) => {
  const email = normalizeEmail(userData.email);
  await validateEmail(email);

  const existingUsers = await findUserByEmailAsync(email);

  if (existingUsers.length > 0) {
    throw { message: "User already exists" };
  }

  const hashedPassword = await bcrypt.hash(userData.password, 10);

  await createAndSendVerificationCode({
    fullName: userData.fullName,
    email,
    password: hashedPassword,
  });

  return {
    email,
    message: "Verification code sent to your email",
  };
};

export const verifyEmailCodeService = async ({ email: rawEmail, code }) => {
  const email = normalizeEmail(rawEmail);
  const cleanCode = String(code || "").trim();

  if (!EMAIL_PATTERN.test(email) || !/^\d{6}$/.test(cleanCode)) {
    throw { message: "Invalid verification details" };
  }

  const pendingRows = await findPendingUserVerificationByEmailAsync(email);

  if (pendingRows.length === 0) {
    throw { message: "No pending verification found for this email" };
  }

  const pendingUser = pendingRows[0];

  if (pendingUser.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    throw { message: "Too many incorrect attempts. Please resend a new code" };
  }

  if (new Date(pendingUser.expires_at).getTime() < Date.now()) {
    throw { message: "Verification code expired. Please resend a new code" };
  }

  const isCodeValid = await bcrypt.compare(cleanCode, pendingUser.verification_code);

  if (!isCodeValid) {
    await incrementPendingVerificationAttemptsAsync(email);
    throw { message: "Incorrect verification code" };
  }

  const existingUsers = await findUserByEmailAsync(email);

  if (existingUsers.length > 0) {
    await deletePendingUserVerificationAsync(email);
    throw { message: "User already exists" };
  }

  const result = await createUserAsync({
    fullName: pendingUser.fullName,
    email: pendingUser.email,
    password: pendingUser.password,
  });

  await deletePendingUserVerificationAsync(email);

  return result;
};

export const resendVerificationCodeService = async ({ email: rawEmail }) => {
  const email = normalizeEmail(rawEmail);
  await validateEmail(email);

  const existingUsers = await findUserByEmailAsync(email);

  if (existingUsers.length > 0) {
    throw { message: "User already exists" };
  }

  const pendingRows = await findPendingUserVerificationByEmailAsync(email);

  if (pendingRows.length === 0) {
    throw { message: "No pending verification found for this email" };
  }

  const pendingUser = pendingRows[0];

  if (new Date(pendingUser.resend_available_at).getTime() > Date.now()) {
    throw { message: "Please wait before requesting another code" };
  }

  await createAndSendVerificationCode({
    fullName: pendingUser.fullName,
    email: pendingUser.email,
    password: pendingUser.password,
  });

  return {
    email,
    message: "A new verification code has been sent",
  };
};

export const loginUser = (userData) => {
  return new Promise((resolve, reject) => {
    findUserByEmail(normalizeEmail(userData.email), async (err, results) => {
      if (err) return reject(err);

      if (results.length === 0) {
        return reject({ message: "User not found" });
      }

      const user = results[0];

      const isMatch = await bcrypt.compare(userData.password, user.password);

      if (!isMatch) {
        return reject({ message: "Invalid credentials" });
      }

      // 🔥 Create token
      const token = jwt.sign(
        {
          id: user.id,
          role: user.role,
          fullName: user.fullName,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES },
      );

      resolve({
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      });
    });
  });
};

export const getAllUsersService = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT id, fullName, email, role, created_at FROM users ORDER BY created_at DESC", (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export const updateUserRoleService = (userId, role) => {
  return new Promise((resolve, reject) => {
    db.query("UPDATE users SET role = ? WHERE id = ?", [role, userId], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

export const deleteUserService = (userId) => {
  return new Promise((resolve, reject) => {
    db.query("DELETE FROM users WHERE id = ?", [userId], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

const updateUserAsync = (userId, updates) =>
  new Promise((resolve, reject) => {
    updateUser(userId, updates, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

export const updateProfileService = async (userId, data, currentUserRole) => {
  const updates = {};
  
  if (data.fullName) {
    updates.fullName = data.fullName.trim();
  }
  
  let newEmail = null;
  if (data.email) {
    newEmail = normalizeEmail(data.email);
    await validateEmail(newEmail);
    
    // Check if email is already taken by ANOTHER user
    const existingUsers = await findUserByEmailAsync(newEmail);
    if (existingUsers.length > 0 && existingUsers[0].id !== userId) {
      throw { message: "Email is already taken by another user" };
    }
    updates.email = newEmail;
  }
  
  if (data.password) {
    if (!data.oldPassword) {
      throw { message: "Current password is required to set a new password" };
    }

    // Fetch user to verify old password
    const currentUser = await new Promise((resolve, reject) => {
      db.query("SELECT password FROM users WHERE id = ?", [userId], (err, results) => {
        if (err) return reject(err);
        if (results.length === 0) return reject({ message: "User not found" });
        resolve(results[0]);
      });
    });

    const isMatch = await bcrypt.compare(data.oldPassword, currentUser.password);
    if (!isMatch) {
      throw { message: "Incorrect current password" };
    }

    updates.password = await bcrypt.hash(data.password, 10);
  }
  
  await updateUserAsync(userId, updates);
  
  // Re-fetch user to generate a new token
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM users WHERE id = ?", [userId], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return reject({ message: "User not found" });
      
      const user = results[0];
      const token = jwt.sign(
        {
          id: user.id,
          role: user.role,
          fullName: user.fullName,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES || "1d" } // Added fallback for JWT_EXPIRES
      );
      
      resolve({
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      });
    });
  });
};

