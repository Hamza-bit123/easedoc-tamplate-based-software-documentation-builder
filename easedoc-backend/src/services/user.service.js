import bcrypt from "bcryptjs";
import { createUser, findUserByEmail } from "../models/user.model.js";
import jwt from "jsonwebtoken";

export const registerUser = async (userData) => {
  return new Promise((resolve, reject) => {
    findUserByEmail(userData.email, async (err, results) => {
      if (err) return reject(err);

      if (results.length > 0) {
        return reject({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);

      createUser(
        {
          ...userData,
          password: hashedPassword,
        },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        },
      );
    });
  });
};

export const loginUser = (userData) => {
  return new Promise((resolve, reject) => {
    findUserByEmail(userData.email, async (err, results) => {
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
