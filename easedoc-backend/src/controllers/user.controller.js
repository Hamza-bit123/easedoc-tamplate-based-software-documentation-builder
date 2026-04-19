import { registerUser } from "../services/user.service.js";
import { loginUser } from "../services/user.service.js";

export const register = async (req, res) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json({
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Registration failed",
    });
  }
};

export const login = async (req, res) => {
  try {
    const result = await loginUser(req.body);

    res.status(200).json({
      message: "Login successful",
      ...result,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Login failed",
    });
  }
};
