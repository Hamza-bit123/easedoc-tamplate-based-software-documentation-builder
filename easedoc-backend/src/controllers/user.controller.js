import { registerUser, loginUser, getAllUsersService, updateUserRoleService, deleteUserService } from "../services/user.service.js";

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

export const getAllUsers = async (req, res) => {
  try {
    const users = await getAllUsersService();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    await updateUserRoleService(req.params.id, req.body.role);
    res.json({ message: "User role updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error updating user role" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    await deleteUserService(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting user" });
  }
};
